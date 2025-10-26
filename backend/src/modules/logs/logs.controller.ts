import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../аутентификация/jwt-auth.guard';
import { Roles } from '../аутентификация/roles.decorator';
import { RolesGuard } from '../аутентификация/roles.guard';
import { UserRole } from '../../entities/user.entity';
import { readFile } from 'fs/promises';
import { join } from 'path';

@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN) // Only admins can view logs
export class LogsController {
  private readonly logsPath = join(process.cwd(), 'server.log');

  @Get()
  async getLogs(
    @Query('lines') lines?: string,
    @Query('level') level?: string,
    @Request() req?: any
  ) {
    try {
      const logContent = await readFile(this.logsPath, 'utf-8');
      const logLines = logContent.split('\n').filter(line => line.trim());

      let filteredLines = logLines;

      // Filter by level if specified
      if (level) {
        filteredLines = logLines.filter(line => 
          line.toLowerCase().includes(level.toLowerCase())
        );
      }

      // Filter by emoji indicators
      if (!level) {
        // Show important logs by default (with emojis and errors)
        filteredLines = logLines.filter(line => {
          const hasEmoji = /[📝🔨✅❌📎ℹ️🎯🔍]/.test(line);
          const isError = line.toLowerCase().includes('error');
          return hasEmoji || isError;
        });
      }

      // Get last N lines
      const numLines = parseInt(lines || '100', 10) || 100;
      const lastLines = filteredLines.slice(-numLines);

      // Parse and format logs
      const parsedLogs = lastLines.map((line, index) => {
        const timestampMatch = line.match(/\[(.*?)\]/);
        const timestamp = timestampMatch ? timestampMatch[1] : null;
        
        const levelMatch = line.match(/\[(\w+)\]/g);
        const logLevel = levelMatch ? levelMatch[levelMatch.length - 1] : null;
        
        // Extract emoji and message
        const emojiMatch = line.match(/([📝🔨✅❌📎ℹ️🎯🔍])\s*/);
        const emoji = emojiMatch ? emojiMatch[1] : null;
        
        return {
          id: index,
          timestamp,
          level: logLevel || 'LOG',
          emoji,
          message: line,
          raw: line,
        };
      });

      return {
        success: true,
        total: logLines.length,
        filtered: filteredLines.length,
        returned: parsedLogs.length,
        logs: parsedLogs,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to read logs',
      };
    }
  }

  @Get('search')
  async searchLogs(
    @Query('query') query: string,
    @Query('lines') lines?: string,
    @Request() req?: any
  ) {
    try {
      if (!query) {
        return {
          success: false,
          message: 'Query parameter is required',
        };
      }

      const logContent = await readFile(this.logsPath, 'utf-8');
      const logLines = logContent.split('\n').filter(line => line.trim());

      // Search in logs
      const matchingLines = logLines.filter(line => 
        line.toLowerCase().includes(query.toLowerCase())
      );

      const numLines = parseInt(lines, 10) || 50;
      const lastLines = matchingLines.slice(-numLines);

      const parsedLogs = lastLines.map((line, index) => {
        const timestampMatch = line.match(/\[(.*?)\]/);
        const timestamp = timestampMatch ? timestampMatch[1] : null;
        
        return {
          id: index,
          timestamp,
          message: line,
          raw: line,
        };
      });

      return {
        success: true,
        query,
        total: matchingLines.length,
        returned: parsedLogs.length,
        logs: parsedLogs,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to search logs',
      };
    }
  }

  @Get('recent')
  async getRecentLogs(@Request() req?: any) {
    try {
      const logContent = await readFile(this.logsPath, 'utf-8');
      const logLines = logContent.split('\n').filter(line => line.trim());

      // Get last 20 lines with important markers
      const recentLogs = logLines.slice(-100).filter(line => {
        const hasEmoji = /[📝🔨✅❌📎ℹ️🎯🔍]/.test(line);
        const isError = line.toLowerCase().includes('error');
        const isWarn = line.toLowerCase().includes('warn');
        return hasEmoji || isError || isWarn;
      }).slice(-20);

      const parsedLogs = recentLogs.map((line, index) => {
        const timestampMatch = line.match(/\[(.*?)\]/);
        const timestamp = timestampMatch ? timestampMatch[1] : null;
        
        const levelMatch = line.match(/\[(\w+)\]/g);
        const logLevel = levelMatch ? levelMatch[levelMatch.length - 1] : null;
        
        const emojiMatch = line.match(/([📝🔨✅❌📎ℹ️🎯🔍])\s*/);
        const emoji = emojiMatch ? emojiMatch[1] : null;
        
        const isError = line.toLowerCase().includes('error');
        const isWarn = line.toLowerCase().includes('warn');

        return {
          id: index,
          timestamp,
          level: logLevel || (isError ? 'ERROR' : isWarn ? 'WARN' : 'LOG'),
          emoji,
          message: line.substring(0, 200), // Truncate long messages
          raw: line,
        };
      });

      return {
        success: true,
        count: parsedLogs.length,
        logs: parsedLogs,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to read recent logs',
      };
    }
  }
}
