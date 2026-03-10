/**
 * Fleet Repository Interface (Port)
 */

import { Fleet } from '../../entities';

export interface IFleetFilter {
  organizationId?: string;
  tags?: string[];
}

export interface IFleetRepository {
  findById(id: string): Promise<Fleet | null>;

  findMany(filter: IFleetFilter, limit?: number, offset?: number): Promise<Fleet[]>;

  findByOrganization(organizationId: string): Promise<Fleet[]>;

  create(fleet: Fleet): Promise<Fleet>;

  update(id: string, fleet: Partial<Fleet>): Promise<Fleet>;

  delete(id: string): Promise<void>;

  count(filter: IFleetFilter): Promise<number>;
}

