const fs = require('fs');
var emailConfig = JSON.parse(fs.readFileSync('./emailConfig.json','utf8'));
var nodemailer = require('nodemailer');

exports.SendMail = function(logger, subject, message)
{
    try{
       
        let transporter =  nodemailer.createTransport({
            pool: true,
            host: emailConfig.smtpServer,
            port: emailConfig.port,
            secure:true,
            auth: {
                user: emailConfig.username,
                pass: emailConfig.password
            },
            tls: {
                rejectUnauthorized: false
            },
            // logger: true,
            // debug: true
        });

        transporter.sendMail({
            from: emailConfig.fromAddress,
            to: emailConfig.toAddress,
            subject, subject,
            html: message
        }, function(error, info) {
            if (error) {
              logger.debug(error)
            } else {
              logger.debug("mail sent");
            }
        });

    }
    catch(error)
    {
        logger.debug(error.stack);
    }
}