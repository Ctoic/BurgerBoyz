import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class VerifySignupOtpDto {
  @IsEmail()
  email!: string;

  @Matches(/^\d+$/)
  @MinLength(4)
  @MaxLength(8)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}
