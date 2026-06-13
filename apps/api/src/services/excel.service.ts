/**
 * src/services/excel.service.ts — Excel import/export engine.
 * Used by Owner bulk upload, plus all roles' data exports.
 */

import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { Role } from '@unify/shared-types';

interface BulkUserRow {
  username: string;
  role: Role;
  departmentCode?: string;
  firstName?: string;
  lastName?: string;
}

export const excelService = {
  async parseUserBulkUpload(filePath: string): Promise<BulkUserRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];

    // Expected headers: username, role, departmentCode, firstName, lastName
    const headerRow = sheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell, col) => {
      headers[col - 1] = String(cell.value || '').trim();
    });

    const idx = (name: string): number => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());

    const usernameIdx = idx('username');
    const roleIdx = idx('role');
    const deptIdx = idx('departmentcode');
    const firstIdx = idx('firstname');
    const lastIdx = idx('lastname');

    if (usernameIdx === -1 || roleIdx === -1) {
      throw new Error('هدرهای الزامی (username, role) یافت نشدند');
    }

    const rows: BulkUserRow[] = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const username = String(row.getCell(usernameIdx + 1).value || '').trim();
      const roleRaw = String(row.getCell(roleIdx + 1).value || '').trim().toUpperCase().replace(/ /g, '_');
      if (!username || !roleRaw) return;
      if (!(roleRaw in Role)) return;
      rows.push({
        username,
        role: roleRaw as Role,
        departmentCode: deptIdx >= 0 ? String(row.getCell(deptIdx + 1).value || '').trim() || undefined : undefined,
        firstName: firstIdx >= 0 ? String(row.getCell(firstIdx + 1).value || '').trim() || undefined : undefined,
        lastName: lastIdx >= 0 ? String(row.getCell(lastIdx + 1).value || '').trim() || undefined : undefined,
      });
    });

    return rows;
  },

  async exportGeneratedPasswords(rows: Array<{ username: string; password: string }>): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Passwords');
    sheet.columns = [
      { header: 'Username', key: 'username', width: 25 },
      { header: 'Password', key: 'password', width: 20 },
    ];
    rows.forEach((r) => sheet.addRow(r));
    sheet.getRow(1).font = { bold: true };

    const exportDir = path.join(config.storage.basePath, 'exports');
    fs.mkdirSync(exportDir, { recursive: true });
    const fileName = `passwords-${Date.now()}.xlsx`;
    const filePath = path.join(exportDir, fileName);
    await workbook.xlsx.writeFile(filePath);

    return `/api/files/exports/${fileName}`;
  },

  /** Generic data export: rows is a list of plain objects. */
  async exportData(filename: string, rows: Record<string, unknown>[]): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Data');
    if (rows.length === 0) {
      sheet.addRow(['No data']);
    } else {
      sheet.columns = Object.keys(rows[0]).map((k) => ({ header: k, key: k, width: 25 }));
      rows.forEach((r) => sheet.addRow(r));
      sheet.getRow(1).font = { bold: true };
    }
    const exportDir = path.join(config.storage.basePath, 'exports');
    fs.mkdirSync(exportDir, { recursive: true });
    const filePath = path.join(exportDir, filename);
    await workbook.xlsx.writeFile(filePath);
    return `/api/files/exports/${filename}`;
  },
};
