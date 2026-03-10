/**
 * Firmware Repository Interface (Port)
 */

import { Firmware } from '../../entities';
import { FirmwareStatus, FirmwareType } from '../../enums';

export interface IFirmwareFilter {
  status?: FirmwareStatus;
  type?: FirmwareType;
  deviceTypes?: string[];
  createdBy?: string;
}

export interface IFirmwareRepository {
  findById(id: string): Promise<Firmware | null>;

  findByVersion(version: string): Promise<Firmware | null>;

  findMany(filter: IFirmwareFilter, limit?: number, offset?: number): Promise<Firmware[]>;

  findLatest(deviceType: string): Promise<Firmware | null>;

  create(firmware: Firmware): Promise<Firmware>;

  update(id: string, firmware: Partial<Firmware>): Promise<Firmware>;

  delete(id: string): Promise<void>;

  count(filter: IFirmwareFilter): Promise<number>;
}

