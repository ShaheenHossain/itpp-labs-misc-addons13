# -*- coding: utf-8 -*-
# Copyright 2017 Artyom Losev
# License MIT (https://opensource.org/licenses/MIT).
from odoo import api, fields, models


class SaleLayoutCategory(models.Model):
    _inherit = "sale.layout_category"

    sale_order_id = fields.Many2one("sale.order")
    is_global = fields.Boolean(default=False, string="Global")


class SaleOrderLine(models.Model):
    _inherit = "sale.order.line"

    @api.model
    def create(self, vals):
        record = super(SaleOrderLine, self).create(vals)
        if record.layout_category_id and not record.layout_category_id.sale_order_id:
            record.layout_category_id.sale_order_id = record.order_id
        return record
