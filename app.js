var express = require('express');
var _ = require("underscore");

module.exports = {
    "title": "Gocardless Callback",
    "name": "gccb",
    "routes": [],
    "app": function membership (config, db, site) {
        var app = express();
        var gc = GoCardless(config.gocardless);
        
        app.post('/webhook/:key', function(req, res) {
            if ((req.params.key == config.gocardless.secretKey) && (gocardless.webhookValid(req.body))) { // req.body is a guess
                if (req.body.payload.resource_type == "bill") {
                    if (req.body.payload.action == config.gocardless.paidWhen) { // can be either paid or withdrawn (i.e.: paid out)
                        _.each(req.body.payload.bills, function (bill) {
                            if ((bill.status == "paid") && (bill.source_type == "subscription")) {
                                // should probably check the amount here
                                User.findOne({where: {gc_subscription: bill.source_id}}, function (err, user) {
                                    if (!err && user) {
                                        user.last_payment = new Date();
                                        user.save(function (err,user) {
                                            if (err) {
                                                console.log("Could not save user: " + user);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                        // should check here for billing issues
                    }
                }
                // could check if it is an update about subscription cancellations
                res.send(200);
            }
            else {
                return res.send(403);
            }
        });
        
        return app;
    }
}

