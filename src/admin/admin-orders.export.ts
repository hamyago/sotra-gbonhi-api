import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderFiltersDto } from './dto/order-filters.dto';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AdminOrdersExportService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}

  async generateOrdersPdf(filters: OrderFiltersDto): Promise<Buffer> {
    const { orders, meta } = await this.fetchOrders(filters);
    return this.buildPdf(orders, meta);
  }

  async fetchOrders(filters: OrderFiltersDto) {
    const qb = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.tickets', 'tickets')
      .leftJoinAndSelect('order.event', 'event')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.ticketCategory', 'itemCategory')
      .orderBy('order.createdAt', 'DESC')
      .take(5000);

    if (filters.eventId) {
      qb.andWhere('order.eventId = :eventId', { eventId: filters.eventId });
    }
    if (filters.status) {
      qb.andWhere('order.status = :status', { status: filters.status });
    }
    if (filters.from) {
      qb.andWhere('order.createdAt >= :from', { from: filters.from });
    }
    if (filters.to) {
      qb.andWhere('order.createdAt <= :to', { to: filters.to });
    }

    const orders = await qb.getMany();
    const totalAmount = orders
      .filter((o) => o.status === 'PAID')
      .reduce((s, o) => s + Number(o.totalAmount), 0);
    const totalTickets = orders
      .filter((o) => o.status === 'PAID')
      .reduce(
        (s, o) =>
          s +
          (o.items || []).reduce((ss, it) => ss + it.quantity, 0) +
          (o.transportQuantity || 0) +
          (o.parkingQuantity || 0),
        0,
      );

    return {
      orders,
      meta: {
        totalOrders: orders.length,
        paidOrders: orders.filter((o) => o.status === 'PAID').length,
        totalAmount,
        totalTickets,
        eventTitle: orders[0]?.event?.title ?? null,
        filters,
      },
    };
  }

  private buildPdf(orders: Order[], meta: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 40,
          info: {
            Title: 'Rapport des commandes — SOTRA GBONHI',
            Author: 'SOTRA GBONHI',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // ============ EN-TÊTE ============
        const logoPath = this.findLogo();
        if (logoPath) {
          try {
            doc.image(logoPath, 40, 40, { width: 60 });
          } catch (_) {
            // logo pas trouvé, on continue
          }
        }

        doc
          .fillColor('#0F5132')
          .font('Helvetica-Bold')
          .fontSize(20)
          .text('SOTRA GBONHI', 110, 45)
          .fillColor('#666')
          .font('Helvetica')
          .fontSize(10)
          .text('Plateforme de mobilité événementielle', 110, 68);

        doc
          .moveDown(0.3)
          .fillColor('#333')
          .font('Helvetica-Bold')
          .fontSize(16)
          .text('Rapport des commandes', 110, 90);

        doc
          .fillColor('#999')
          .font('Helvetica')
          .fontSize(9)
          .text(`Généré le ${new Date().toLocaleString('fr-FR')}`, 110, 112);

        // Ligne séparatrice
        doc
          .moveTo(40, 130)
          .lineTo(555, 130)
          .strokeColor('#0F5132')
          .lineWidth(2)
          .stroke();

        // ============ FILTRES ============
        let y = 145;
        doc
          .fillColor('#333')
          .font('Helvetica-Bold')
          .fontSize(10)
          .text('Filtres appliqués :', 40, y);
        y += 16;

        doc.font('Helvetica').fontSize(9).fillColor('#666');
        if (meta.filters.eventId) {
          doc.text(`• Événement : ${meta.eventTitle ?? meta.filters.eventId}`, 50, y);
          y += 14;
        }
        if (meta.filters.status) {
          doc.text(`• Statut : ${meta.filters.status}`, 50, y);
          y += 14;
        }
        if (meta.filters.from) {
          doc.text(`• Du : ${meta.filters.from}`, 50, y);
          y += 14;
        }
        if (meta.filters.to) {
          doc.text(`• Au : ${meta.filters.to}`, 50, y);
          y += 14;
        }
        if (!meta.filters.eventId && !meta.filters.status && !meta.filters.from && !meta.filters.to) {
          doc.text('• Aucun filtre (toutes les commandes)', 50, y);
          y += 14;
        }

        // ============ TOTAUX ============
        y += 8;
        doc
          .rect(40, y, 515, 50)
          .fillColor('#F0F9F4')
          .fill();

        doc
          .fillColor('#0F5132')
          .font('Helvetica-Bold')
          .fontSize(11)
          .text(`${meta.totalOrders} commandes`, 55, y + 8)
          .text(`${meta.paidOrders} payées`, 55, y + 26)
          .text(`${meta.totalTickets} billets`, 200, y + 8)
          .text(
            `${(meta.totalAmount / 1000).toFixed(1)}k FCFA`,
            200,
            y + 26,
          )
          .text(
            meta.paidOrders > 0
              ? `Panier moyen : ${Math.round(meta.totalAmount / meta.paidOrders)} FCFA`
              : 'Panier moyen : —',
            360,
            y + 8,
          )
          .text(
            `Taux de paiement : ${meta.totalOrders > 0 ? Math.round((meta.paidOrders / meta.totalOrders) * 100) : 0}%`,
            360,
            y + 26,
          );

        y += 70;

        // ============ TABLEAU ============
        doc
          .fillColor('#333')
          .font('Helvetica-Bold')
          .fontSize(10)
          .text('Détail des commandes', 40, y);
        y += 18;

        const cols = [
          { key: 'reference', label: 'Référence', width: 75 },
          { key: 'date', label: 'Date', width: 70 },
          { key: 'client', label: 'Client', width: 100 },
          { key: 'phone', label: 'Téléphone', width: 85 },
          { key: 'status', label: 'Statut', width: 55 },
          { key: 'amount', label: 'Montant', width: 65 },
        ];

        // Header du tableau
        doc.rect(40, y, 515, 18).fillColor('#0F5132').fill();
        let x = 45;
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
        for (const col of cols) {
          doc.text(col.label, x, y + 5, { width: col.width - 5, lineBreak: false });
          x += col.width;
        }
        y += 18;

        // Lignes
        doc.font('Helvetica').fontSize(7.5).fillColor('#333');
        let rowIndex = 0;
        for (const o of orders) {
          if (y > 760) {
            doc.addPage();
            y = 40;
            // Re-header
            doc.rect(40, y, 515, 18).fillColor('#0F5132').fill();
            x = 45;
            doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
            for (const col of cols) {
              doc.text(col.label, x, y + 5, { width: col.width - 5, lineBreak: false });
              x += col.width;
            }
            y += 18;
            doc.font('Helvetica').fontSize(7.5).fillColor('#333');
          }

          // Zebra
          if (rowIndex % 2 === 0) {
            doc.rect(40, y, 515, 16).fillColor('#F7F7F7').fill();
          }

          x = 45;
          const rowData = [
            o.reference,
            new Date(o.createdAt).toLocaleDateString('fr-FR'),
            o.customerName ?? '',
            o.customerPhone ?? '',
            o.status,
            `${Number(o.totalAmount).toFixed(0)} F`,
          ];

          doc.fillColor('#333');
          for (let i = 0; i < cols.length; i++) {
            doc.text(rowData[i], x, y + 4, {
              width: cols[i].width - 5,
              lineBreak: false,
              ellipsis: true,
            });
            x += cols[i].width;
          }

          y += 16;
          rowIndex++;
        }

        // ============ PIED DE PAGE ============
        doc
          .fillColor('#999')
          .fontSize(7)
          .text(
            `Rapport SOTRA GBONHI — Confidentiel — Page 1`,
            40,
            800,
            { align: 'center', width: 515 },
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private findLogo(): string | null {
    const candidates = [
      path.join(process.cwd(), 'uploads', 'logo.png'),
      path.join(process.cwd(), 'uploads', 'sotra-logo.png'),
      path.join(process.cwd(), 'src', 'assets', 'logo.png'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }
}
