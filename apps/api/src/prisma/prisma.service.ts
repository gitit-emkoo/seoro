import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    // DB가 아직 없어도 부팅은 가능하도록 connect는 사용 시점에 수행합니다.
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
