/**
 * Deployment Repository Interface (Port)
 */

import { Deployment } from '../../entities';
import { DeploymentStatus } from '../../enums';

export interface IDeploymentFilter {
  firmwareId?: string;
  status?: DeploymentStatus;
  createdBy?: string;
}

export interface IDeploymentRepository {
  findById(id: string): Promise<Deployment | null>;

  findMany(filter: IDeploymentFilter, limit?: number, offset?: number): Promise<Deployment[]>;

  findActive(): Promise<Deployment[]>;

  create(deployment: Deployment): Promise<Deployment>;

  update(id: string, deployment: Partial<Deployment>): Promise<Deployment>;

  delete(id: string): Promise<void>;

  count(filter: IDeploymentFilter): Promise<number>;
}

