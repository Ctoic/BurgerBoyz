import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateAddOnDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
