import { OrderStatus, TerritoryType } from '../interfaces/order.interface';
import { FileResponseDto } from './file.dto';
export interface CreateOrderDto {
    organizationId: number;
    title: string;
    description?: string;
    location: string;
    distanceKm?: number;
    territoryType?: TerritoryType;
    plannedStartDate?: Date;
}
export interface UpdateOrderDto {
    organizationId?: number;
    title?: string;
    description?: string;
    location?: string;
    distanceKm?: number;
    territoryType?: TerritoryType;
    status?: OrderStatus;
    plannedStartDate?: Date;
    actualStartDate?: Date;
    completionDate?: Date;
    assignedEngineerId?: number;
    assignedById?: number;
}
export interface AssignEngineerDto {
    engineerId: number;
}
export interface OrderDto {
    id: number;
    organizationId: number;
    organization?: {
        id: number;
        name: string;
    };
    assignedEngineerId?: number;
    assignedEngineer?: {
        id: number;
        firstName: string;
        lastName: string;
    };
    createdById: number;
    createdBy: {
        id: number;
        firstName: string;
        lastName: string;
    };
    assignedById?: number;
    assignedBy?: {
        id: number;
        firstName: string;
        lastName: string;
    };
    title: string;
    description?: string;
    location: string;
    distanceKm?: number;
    territoryType?: TerritoryType;
    status: OrderStatus;
    plannedStartDate?: Date;
    actualStartDate?: Date;
    completionDate?: Date;
    files?: FileResponseDto[];
    createdAt: Date;
    updatedAt: Date;
}
export interface OrdersQueryDto {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    organizationId?: number;
    engineerId?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}
