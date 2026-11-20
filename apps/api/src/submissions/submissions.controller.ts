import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Res,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsString } from 'class-validator';
import type { Response } from 'express';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorageService } from '../storage/storage.service';
import { SubmissionsService } from './submissions.service';

class UploadDto {
  @IsString()
  verificationItemId!: string;
}

@Controller('submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(
    private readonly submissionsService: SubmissionsService,
    private readonly storage: StorageService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.submissionsService.listMine(user.id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDto,
  ) {
    return this.submissionsService.upload(user.id, dto.verificationItemId, file);
  }

  @Get(':id/file')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const submission = await this.submissionsService.getOwnFile(user.id, id);
    res.setHeader(
      'Content-Type',
      submission.mimeType || 'application/octet-stream',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(submission.originalFileName || 'file')}"`,
    );
    this.storage.openReadStream(submission.storedFileKey!).pipe(res);
  }
}
