import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';

@Controller({ path: 'assets', version: '1' })
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(private assetsService: AssetsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.assetsService.findAll(user.userId);
  }

  @Get('net-worth')
  getNetWorth(@CurrentUser() user: JwtPayload) {
    return this.assetsService.getNetWorth(user.userId);
  }

  @Get('history')
  getHistory(@CurrentUser() user: JwtPayload) {
    return this.assetsService.getHistory(user.userId);
  }

  @Get('allocation')
  getAllocation(@CurrentUser() user: JwtPayload) {
    return this.assetsService.getAllocation(user.userId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.assetsService.findOne(user.userId, id);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAssetDto) {
    return this.assetsService.create(user.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: Partial<CreateAssetDto>,
  ) {
    return this.assetsService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.assetsService.remove(user.userId, id);
  }
}
