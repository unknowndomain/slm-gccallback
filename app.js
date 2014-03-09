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
            if (gc.webhookValid(req.body)) { // req.body is a guess
                res.send(200);
                if (req.params.key == config.gocardless.secretKey) {
                    if (req.body.payload.resource_type == "bill") {
                        if (req.body.payload.action == config.gocardless.paidWhen) { // can be either paid or withdrawn (i.e.: paid out)
                            _.each(req.body.payload.bills, function (bill) {
                                if ((bill.status == config.gocardless.paidWhen) && (bill.source_type == "subscription") && (bill.ammount >= config.gocardless.minimum)) {
                                    // should probably check the amount here
                                    res.locals.User.findOne({where: {gc_subscription: bill.source_id}}, function (err, user) {
                                        if (!err && user) {
                                            user.historic_events.create({
                                                "description": "Payment received. Thank you.",
                                                "type": "membership",
                                                "value": bill.amount_minus_fees
                                            }, function (err, event) {
                                                if (!err) {
                                                    user.paid();
                                                    user.save(function (err, user) {
                                                        if (!err) {
                                                            console.log("User '" + user.email + "' last paid value updated");
                                                        }
                                                        else {
                                                            console.log("Could not save subscription '" + bill.source_id + "' for user: " + user.email);
                                                        }
                                                    });
                                                }
                                                else {
                                                    console.log("Could not save user '" + user.email + "' payment received.");
                                                    

                                                }
                                            });;
 
                                        }
                                        else {
                                            if (!user) {
                                                console.log("Could not find user with '" + bill.source_id);
                                            }
                                            else {
                                                console.log("Could not find user with '" + bill.source_id + "' because: " + err);
                                            }
                                        }
                                    });
                                }
                            });
                        }
                    }
                }
                else {
                    console.log("Accessed invalid key. Got: " + req.params.key);
                }
            }
            else {
                return res.send(403);
            }
        });
        
        return app;
    }
}

