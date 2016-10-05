var Service, Characteristic;
var request = require("request");

module.exports = function(homebridge){
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerAccessory("homebridge-http-advanced", "Http-advanced", HttpAdvancedAccessory);
}


function HttpAdvancedAccessory(log, config) {
  this.log = log;

 	// url info
	this.lock_url               = config["lock_url"]; 
	this.lock_body              = config["lock_body"];
	this.unlock_url             = config["unlock_url"]  			|| this.lock_url;
	this.unlock_body            = config["unlock_body"] 			|| this.lock_body;
	this.status_url             = config["status_url"];
	this.http_method            = config["http_method"] 	  	 	|| "GET";
	this.http_brightness_method = config["http_brightness_method"] 	|| this.http_method;
	this.http_lock_method       = config["http_lock_method"] 	 	|| this.http_method;
	this.username               = config["username"] 	  	 	 	|| "";
	this.password               = config["password"] 	  	 	 	|| "";
	this.sendimmediately        = config["sendimmediately"] 	 	|| "";
	this.service                = config["service"] 	  	 	 	|| "Switch";
	this.name                   = config["name"];

	this.service = new Service.LockMechanism(this.name);
  
  	this.service
    .getCharacteristic(Characteristic.LockCurrentState)
    .on('get', this.getState.bind(this));
  
  	this.service
    .getCharacteristic(Characteristic.LockTargetState)
    .on('get', this.getState.bind(this))
    .on('set', this.setState.bind(this));
}

HttpAdvancedAccessory.prototype = {

	httpRequest: function(url, body, method, username, password, sendimmediately, callback) {
		request({
			url: url,
			body: body,
			method: method,
			rejectUnauthorized: false,
			auth: {
				user: username,
				pass: password,
				sendImmediately: sendimmediately
			}
		},
		function(error, response, body) {
			callback(error, response, body)
		})
	},
  	getState: function(callback){
	    var url;
	    var body;

	    if (!this.status_url) {
	            this.log.warn("Ignoring request; No Door Status url defined.");
	            callback(new Error("No Door Status url defined."));
	        return;
	    }

	    url = this.status_url;
	    body = this.lock_body;
	    this.log("Check Status of Door");
		this.httpRequest(url, "", "GET", this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
	    	if (error) {
	        	this.log('HTTP Door Status function failed: %s', error.message);
	            	callback(error);
	        } 
	        else {
				responseJSON = JSON.parse(responseBody);
				this.log(responseJSON.lock);
				var StatusENUM = (responseJSON.lock == "locked") ? Characteristic.LockCurrentState.SECURED : Characteristic.LockCurrentState.UNSECURED ;
	        	this.log('HTTP Door Status is %s!', StatusENUM);
	            callback(null, StatusENUM);
	        }
        }.bind(this));
    },
	setState: function(state,callback) {
		var url;
		var body;

		if (!this.unlock_url || !this.lock_url) {
			this.log.warn("Ignoring request; No Door url defined.");
			callback(new Error("No Door url defined."));
		    return;
		}
		this.log("Setting Target State based on %d:", state);
	    if (state) {
			url = this.lock_url;
			body = this.lock_body;
			this.log("Locking Door");
	    } else {
      		url = this.unlock_url;
            body = this.unlock_body;
      		this.log("Unlocking Door");
	    }
		this.httpRequest(url, body, this.http_method, this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
			if (error) {
				this.log('HTTP Door function failed: %s', error.message);
				callback(error);
			} else {
				this.log('HTTP Door function succeeded!');
				var currentState = (state == Characteristic.LockTargetState.SECURED) ? Characteristic.LockCurrentState.SECURED : Characteristic.LockCurrentState.UNSECURED;
				this.service.setCharacteristic(Characteristic.LockCurrentState, currentState);
				callback();
			}
		}.bind(this));
	},

  getServices: function() {
    
  	return [this.service];
  }

};
