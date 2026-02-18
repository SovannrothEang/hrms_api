import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync } from 'node:fs';

@Injectable()
export class FileStorageService {
    private readonly logger = new Logger(FileStorageService.name);
    private readonly publicRoot = 'public';

    async saveFileAsync(
        tableName: string,
        id: string,
        file: Express.Multer.File,
    ): Promise<string> {
        const now = new Date();
        const timestamp =
            now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0') +
            '_' +
            now.getHours().toString().padStart(2, '0') +
            now.getMinutes().toString().padStart(2, '0') +
            now.getSeconds().toString().padStart(2, '0') +
            now.getMilliseconds().toString().padStart(3, '0');

        const ext = path.extname(file.originalname).toLowerCase();
        const fileName = `${id}_${timestamp}${ext}`;
        const relativeDir = path.join('images', tableName);
        const absoluteDir = path.join(
            process.cwd(),
            this.publicRoot,
            relativeDir,
        );

        if (!existsSync(absoluteDir)) {
            await fs.mkdir(absoluteDir, { recursive: true });
        }

        const relativePath = path.join(relativeDir, fileName);
        const absolutePath = path.join(
            process.cwd(),
            this.publicRoot,
            relativePath,
        );

        await fs.writeFile(absolutePath, file.buffer);

        // Return path with forward slashes for URL compatibility
        return relativePath.split(path.sep).join('/');
    }

    async deleteFileAsync(relativePath: string): Promise<void> {
        if (!relativePath) return;

        const absolutePath = path.join(
            process.cwd(),
            this.publicRoot,
            relativePath,
        );
        try {
            if (existsSync(absolutePath)) {
                await fs.unlink(absolutePath);
                this.logger.log(`Deleted file: ${absolutePath}`);
            }
        } catch (error) {
            this.logger.error(`Failed to delete file: ${absolutePath}`, error);
        }
    }
}
