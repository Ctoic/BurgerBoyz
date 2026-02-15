import { IsEmail, IsOptional, IsString } from "class-validator";

export class CustomerSignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  name!: string;

  @IsString()
  phone!: string;

  @IsString()
  addressLine1!: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsString()
  addressCity!: string;

  @IsString()
  addressPostcode!: string;

  @IsOptional()
  @IsString()
  addressInstructions?: string;
}
