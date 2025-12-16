import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { WhatsappApiMetaService } from './app/whatsapp-api-meta.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        baseURL: `${config.get('WHATSAPP_API_BASE_URL')}/${config.get('WHATSAPP_PHONE_ID')}`,
        headers: {
          Authorization: `Bearer ${config.get('WHATSAPP_API_TOKEN')}`,
          'Content-Type': 'application/json',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [WhatsappApiMetaService],
  exports: [WhatsappApiMetaService],
})
export class WhatsappApiClientModule {}
