import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KycModule } from './kyc/kyc.module';
import { AwsModule } from './aws/aws.module';
import { KycDocument } from './kyc/entities/kyc-document.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'kyc-database.sqlite',
      entities: [KycDocument],
      synchronize: true, // Set to false in production
    }),
    AwsModule,
    KycModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
