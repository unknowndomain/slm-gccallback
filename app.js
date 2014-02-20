var express = require('express');
var GoCardless = require('gocardless');
var _ = require("underscore");

module.exports = {
    "title": "Gocardless Callback",
    "name": "gccb",
    "routes": [],
    "app": function membership (config, db, site) {
        var app = express();
        var gc = GoCardless(config.gocardless);
        
        app.post('/webhook/:key', function(req, res) {
            if (req.params.key == config.gocardless.secretKey) {
                if (gc.webhookValid(req.body)) { // req.body is a guess
                    if (req.body.payload.resource_type == "bill") {
                        if (req.body.payload.action == config.gocardless.paidWhen) { // can be either paid or withdrawn (i.e.: paid out)
                            _.each(req.body.payload.bills, function (bill) {
                                if ((bill.status == config.gocardless.paidWhen) && (bill.source_type == "subscription")) {
                                    // should probably check the amount here
                                    res.locals.User.findOne({where: {gc_subscription: bill.source_id}}, function (err, user) {
                                        if (!err && user) {
                                            user.historic_events.create({
                                                "description": "Payment received. Thank you.",
                                                "type": "membership",
                                                "value": bill.amount_minus_fees
                                            });
                                            user.last_payment = new Date();
                                            user.save(function (err,user) {
                                                if (err) {
                                                    console.log("Could not save subscription '" + bill.source_id + "' for user: " + user);
                                                }
                                            });
                                        }
                                        else {
                                            console.log("Could not find user with '" + bill.source_id + "' because: " + err);
                                            res.send(500, "Database error. Please contact an administrator with the code SLME004");
                                        }
                                    });
                                }
                            });
                            // should check here for billing issues
                        }
                    }
                    // could check if it is an update about subscription cancellations
                    return res.send(200);
                }
                else {
                    return res.send(403, "invalid webhook signature.");
                }
            }
            else {
                return res.send(403, "incorrect secretkey. Got: " + req.params.key);
            }
        });
        
        return app;
    }
}

