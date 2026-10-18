const fs=require('fs'),path=require('path');
module.exports=function(name){const dir=process.env.STARLIGHT_TEST_REPORT_DIR||path.resolve(__dirname,'../.build-mobile/test-reports');fs.mkdirSync(dir,{recursive:true});return path.join(dir,name);};
