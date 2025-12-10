export interface Material {
  id: string;
  name: string;
  quantity: number;
  min_quantity: number;
  created_at?: string;
}

export enum MovementType {
  ENTRY = 'ENTRADA',
  EXIT = 'SAIDA'
}

export interface Movement {
  id: string;
  material_id: string;
  material_name?: string; // Joined field
  type: MovementType;
  quantity: number;
  requester: string;
  vehicle_prefix: string;
  guide_number: string;
  created_at: string; // Acts as movement date
}

export interface Vehicle {
  id: string;
  prefix: string;
  plate: string;
  model: string;
  fraction: string;
}

export type Tab = 'inventory' | 'movements' | 'fleet' | 'setup';