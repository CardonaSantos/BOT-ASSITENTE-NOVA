import { PartialType } from '@nestjs/mapped-types';
import { CreateCloudStorageDospaceDto } from './create-cloud-storage-dospace.dto';

export class UpdateCloudStorageDospaceDto extends PartialType(CreateCloudStorageDospaceDto) {}
