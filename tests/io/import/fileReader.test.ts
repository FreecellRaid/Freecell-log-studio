import { describe, expect, it } from 'vitest';
import { Document, Packer, Paragraph } from 'docx';
import { extractDocxText, isDocxFile } from '@/io/import/fileReader';

describe('DOCX import file reader', () => {
    it('recognizes DOCX files by extension or MIME type', () => {
        expect(isDocxFile({ name: 'log.DOCX', type: '' })).toBe(true);
        expect(
            isDocxFile({
                name: 'log',
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            }),
        ).toBe(true);
        expect(isDocxFile({ name: 'log.txt', type: 'text/plain' })).toBe(false);
    });

    it('extracts paragraphs as plain text', async () => {
        const document = new Document({
            sections: [
                {
                    children: [
                        new Paragraph('Alice 2026/08/18 10:00:00'),
                        new Paragraph('Hello from DOCX'),
                    ],
                },
            ],
        });
        const bytes = Uint8Array.from(await Packer.toBuffer(document));

        await expect(extractDocxText(bytes.buffer)).resolves.toBe(
            'Alice 2026/08/18 10:00:00\n\nHello from DOCX\n\n',
        );
    });
});
