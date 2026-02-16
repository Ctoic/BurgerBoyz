import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class CreateAddOnDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsString()
  name!: string;

  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
