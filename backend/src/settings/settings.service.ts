import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateSettingsDto } from "./dto/update-settings.dto";

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    const settings = await this.prisma.storeSettings.findFirst();
    if (settings) return settings;
    return this.prisma.storeSettings.create({ data: {} });
  }

  async updateSettings(dto: UpdateSettingsDto) {
    const existing = await this.prisma.storeSettings.findFirst();
    if (existing) {
      return this.prisma.storeSettings.update({
        where: { id: existing.id },
        data: dto,
      });
    }
    return this.prisma.storeSettings.create({ data: dto });
  }
}
