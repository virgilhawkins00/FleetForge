/**
 * Tenant Service - Multi-tenant organization management
 * Handles organization CRUD, quotas, billing, and usage tracking
 */

import { Injectable, Logger, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Organization, OrganizationStatus, OrganizationPlan, PLAN_QUOTAS } from '@fleetforge/core';
import { OrganizationRepository, OrganizationMapper } from '@fleetforge/database';
import { v4 as uuidv4 } from 'uuid';

export interface CreateOrganizationDto {
  name: string;
  ownerId: string;
  plan?: OrganizationPlan;
}

export interface UpdateOrganizationDto {
  name?: string;
  settings?: Partial<Organization['settings']>;
}

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(private readonly organizationRepository: OrganizationRepository) {}

  async create(dto: CreateOrganizationDto): Promise<Organization> {
    const slug = this.generateSlug(dto.name);

    // Check if slug already exists
    const existing = await this.organizationRepository.findBySlug(slug);
    if (existing) {
      throw new ConflictException(`Organization with slug '${slug}' already exists`);
    }

    const organization = OrganizationMapper.createDefaultOrganization(
      uuidv4(),
      dto.name,
      slug,
      dto.ownerId,
      dto.plan || OrganizationPlan.FREE,
    );

    const created = await this.organizationRepository.create(organization);
    this.logger.log(`Organization created: ${created.id} (${created.name})`);
    return created;
  }

  async findById(id: string): Promise<Organization> {
    const organization = await this.organizationRepository.findById(id);
    if (!organization) {
      throw new NotFoundException(`Organization ${id} not found`);
    }
    return organization;
  }

  async findByOwner(ownerId: string): Promise<Organization[]> {
    return this.organizationRepository.findByOwner(ownerId);
  }

  async update(id: string, dto: UpdateOrganizationDto): Promise<Organization> {
    const organization = await this.findById(id);

    const updates: Partial<Organization> = {};
    if (dto.name) updates.name = dto.name;
    if (dto.settings) {
      updates.settings = { ...organization.settings, ...dto.settings };
    }

    const updated = await this.organizationRepository.update(id, updates);
    if (!updated) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    this.logger.log(`Organization updated: ${id}`);
    return updated;
  }

  async upgradePlan(id: string, newPlan: OrganizationPlan): Promise<Organization> {
    const organization = await this.findById(id);

    const updated = await this.organizationRepository.update(id, {
      billing: { ...organization.billing, plan: newPlan },
      quotas: { ...PLAN_QUOTAS[newPlan] },
    });

    if (!updated) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    this.logger.log(`Organization ${id} upgraded to ${newPlan}`);
    return updated;
  }

  async suspend(id: string, reason?: string): Promise<Organization> {
    const updated = await this.organizationRepository.update(id, {
      status: OrganizationStatus.SUSPENDED,
    });

    if (!updated) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    this.logger.warn(`Organization ${id} suspended: ${reason || 'No reason provided'}`);
    return updated;
  }

  async activate(id: string): Promise<Organization> {
    const updated = await this.organizationRepository.update(id, {
      status: OrganizationStatus.ACTIVE,
    });

    if (!updated) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    this.logger.log(`Organization ${id} activated`);
    return updated;
  }

  async checkQuota(organizationId: string, resource: 'devices' | 'fleets' | 'users'): Promise<boolean> {
    const org = await this.findById(organizationId);

    if (!org.isActive()) {
      throw new ForbiddenException('Organization is not active');
    }

    switch (resource) {
      case 'devices':
        return org.canAddDevice();
      case 'fleets':
        return org.canAddFleet();
      case 'users':
        return org.canAddUser();
      default:
        return true;
    }
  }

  async incrementUsage(organizationId: string, resource: 'devices' | 'fleets' | 'users', amount: number = 1): Promise<void> {
    const fieldMap: Record<string, keyof Organization['usage']> = {
      devices: 'currentDevices',
      fleets: 'currentFleets',
      users: 'currentUsers',
    };

    await this.organizationRepository.incrementUsage(organizationId, fieldMap[resource], amount);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }
}

