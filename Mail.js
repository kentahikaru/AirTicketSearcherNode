const fs = require('fs');
var emailConfig = JSON.parse(fs.readFileSync('./emailConfig.json','utf8'));
var mailkit = require('mailkit');

exports.SendMail = async function(logger, subject, message)
{
   var mailOptions = {
       from: emailConfig.fromAddress,
       to: emailConfig.toAddress,
       subject: subject,
       body: message,
       smtp: {
           host: emailConfig.smtpServer,
           port: emailConfig.port,
           secureConnection: true,
           auth:
           {
               user: emailConfig.username,
               pass: emailConfig.password
           },
           debug: true
       }
   };

   mailkit.send(mailOptions,function(error,status){
       if(error)
       {
           logger.debug(error.stack);
       }
       else
       {
           logger.debug(status);
       }
   });

}