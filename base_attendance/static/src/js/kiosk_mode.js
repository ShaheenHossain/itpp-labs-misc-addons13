/* Copyright (c) 2004-2015 Odoo S.A.
   Copyright 2018 Kolushov Alexandr <https://it-projects.info/team/KolushovAlexandr>
   License MIT (https://opensource.org/licenses/MIT). */
odoo.define("base_attendance.kiosk_mode", function(require) {
    "use strict";

    var core = require("web.core");
    var Model = require("web.Model");
    var Widget = require("web.Widget");
    var Session = require("web.session");
    var local_storage = require("web.local_storage");
    var BarcodeHandlerMixin = require("barcodes.BarcodeHandlerMixin");

    var QWeb = core.qweb;

    var KioskMode = Widget.extend(BarcodeHandlerMixin, {
        events: {
            "click .o_hr_attendance_button_partners": function() {
                this.do_action("base_attendance.res_partner_action_kanban_view");
            },
        },

        init: function(parent, action) {
            // Note: BarcodeHandlerMixin.init calls this._super.init, so there's no need to do it here.
            // Yet, "_super" must be present in a function for the class mechanism to replace it with the actual parent method.
            /* eslint-disable no-unused-expressions */
            this._super;

            action.target = "fullscreen";
            var hex_scanner_is_used = action.context.hex_scanner_is_used;
            if (typeof hex_scanner_is_used === "undefined") {
                hex_scanner_is_used =
                    this.get_from_storage("hex_scanner_is_used") || false;
            } else {
                this.save_locally("hex_scanner_is_used", Boolean(hex_scanner_is_used));
            }
            this.hex_scanner_is_used = hex_scanner_is_used;

            BarcodeHandlerMixin.init.apply(this, arguments);
        },

        save_locally: function(key, value) {
            local_storage.setItem("est." + key, JSON.stringify(value));
        },

        get_from_storage: function(key) {
            return JSON.parse(local_storage.getItem("est." + key));
        },

        start: function() {
            var self = this;
            self.session = Session;
            var res_company = new Model("res.company");
            res_company
                .query(["name"])
                .filter([["id", "=", self.session.company_id]])
                .all()
                .then(function(companies) {
                    self.company_name = companies[0].name;
                    self.company_image_url = self.session.url("/web/image", {
                        model: "res.company",
                        id: self.session.company_id,
                        field: "logo",
                    });
                    self.$el.html(
                        QWeb.render("BaseAttendanceKioskMode", {widget: self})
                    );
                    self.start_clock();
                });
            return self._super.apply(this, arguments);
        },

        on_barcode_scanned: function(barcode) {
            var self = this;
            var hr_employee = new Model("res.partner");
            var res_barcode = barcode;
            if (this.hex_scanner_is_used) {
                res_barcode = parseInt(barcode, 16).toString();
                if (res_barcode.length % 2) {
                    res_barcode = "0" + res_barcode;
                }
            }
            hr_employee.call("attendance_scan", [res_barcode]).then(function(result) {
                if (result.action) {
                    self.do_action(result.action);
                } else if (result.warning) {
                    self.do_warn(result.warning);
                }
            });
        },

        start_clock: function() {
            this.clock_start = setInterval(function() {
                this.$(".o_hr_attendance_clock").text(
                    new Date().toLocaleTimeString(navigator.language, {
                        hour: "2-digit",
                        minute: "2-digit",
                    })
                );
            }, 900);
            // First clock refresh before interval to avoid delay
            this.$(".o_hr_attendance_clock").text(
                new Date().toLocaleTimeString(navigator.language, {
                    hour: "2-digit",
                    minute: "2-digit",
                })
            );
        },

        destroy: function() {
            clearInterval(this.clock_start);
            this._super.apply(this, arguments);
        },
    });

    core.action_registry.add("base_attendance_kiosk_mode", KioskMode);

    return KioskMode;
});
