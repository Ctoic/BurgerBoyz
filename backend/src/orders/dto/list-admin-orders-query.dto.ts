import { OrderStatus } from "@prisma/client";
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

const RANGE_OPTIONS = ["all", "today", "week", "month", "year", "custom"] as const;

export type OrderRange = (typeof RANGE_OPTIONS)[number];

export class ListAdminOrdersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsIn(RANGE_OPTIONS)
  range?: OrderRange;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

