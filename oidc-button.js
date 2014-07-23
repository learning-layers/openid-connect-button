/*
Copyright (c) 2014 Dominik Renzel, Advanced Community Information Systems (ACIS) Group, 
Chair of Computer Science 5 (Databases & Information Systems), RWTH Aachen University, Germany
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the ACIS Group nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

// definition of variables relevant to OpenID Connect
var oidc_server; // OpenID Connect Provider URL
var oidc_clientid; // OpenID Connect Client ID
var oidc_scope; // OpenID Connect Scope
var oidc_callback; // OpenID Connect Redirect Callback
var oidc_provider_config; // OpenID Connect Provider Configuration
var oidc_userinfo; // OpenID Connect User Info
var oidc_idtoken; // OpenID Connect ID Token (human-readable)

// OpenID Connect Button initialization. 
// Exceptions and debug messages are logged to the console.
try{
	(function() {
		
		if($(".oidc-signin")){
			
			// parse data attributes from signin button.
			oidc_server = $(".oidc-signin").attr("data-server");
			if(oidc_server === undefined || oidc_server === ""){
				throw("Warning: OpenID Connect signin button does not define server URL!");
			}
			oidc_clientid = $(".oidc-signin").attr("data-clientid");
			if(oidc_clientid === undefined || oidc_clientid === ""){
				throw("Warning: OpenID Connect signin button does not define client ID!");
			}
			oidc_scope = $(".oidc-signin").attr("data-scope");
			if(oidc_scope === undefined || oidc_scope === ""){
				throw("Warning: OpenID Connect signin button does not define scope!");
			}
			var cbname = $(".oidc-signin").attr("data-callback");
			if(window[cbname] === undefined || !(typeof window[cbname] === "function")){
				throw("Warning: OpenID Connect signin button does not define a valid callback function!");
			} else {
				oidc_callback = window[cbname];
			}
			
			//console.log("OpenID Connect Server: " + oidc_server);
			//console.log("OpenID Connect Client ID: " + oidc_clientid);
			//console.log("OpenID Connect Scope: " + oidc_scope);
			//console.log("OpenID Connect Callback: " + oidc_callback);
			
			// with all necessary fields defined, retrieve OpenID Connect Server configuration
			getProviderConfig(oidc_server,function(c){
				if(c === "error"){
					throw("Warning: could not retrieve OpenID Connect server configuration!"); 
				} else {
					oidc_provider_config = c;
					
					// after successful retrieval of server configuration, check auth status
					if(checkAuth()){
						// first parse id token
						//oidc_idtoken = getIdToken();
						
						// TODO: parse
						
						// then use access token and retrieve user info
						getUserInfo(function(u){
							if(u["sub"]){
								oidc_userinfo = u;
								renderButton(false);
								oidc_callback("success");
							} else {
								renderButton(true);
								oidc_callback("Error: could not retrieve user info! Cause: " + u.error_description);
							}
						});
						
					} else {
						// render signin button
						renderButton(true);
						oidc_callback("user_signed_out");
					}
				}
			});
			
			
			
		} else {
			console.log("Warning: no OpenID Connect signin button found!");
		}
	})();
} catch (e){
	console.log(e);
}

/**
* renders OpenID Connect Button, including correct click behaviour.
* The button can exist in two different states: "Sign in" and "Sign out"
* In the "Sign in" state, a click brings the user to the 
*
* @param signin boolean true for "Sign in" state, false else 
**/
function renderButton(signin){
	$(".oidc-signin").unbind( "click" );
	$(".oidc-signin").addClass("btn").addClass("btn-lg");
	if(signin){
		$(".oidc-signin").removeClass("btn-success").addClass("btn-default").html("<img src='http://learning-layers.eu/wp-content/themes/learninglayers/images/logo.png' height='32px'/>    Sign in");
		$(".oidc-signin").click(function (e){
			var url = oidc_provider_config.authorization_endpoint + "?response_type=id_token%20token&client_id=" + oidc_clientid + "&scope=" + oidc_scope;
			window.location.href = url;
		});
	} else {
		$(".oidc-signin").removeClass("btn-default").addClass("btn-success").html("<img height='32px' src='http://learning-layers.eu/wp-content/themes/learninglayers/images/logo.png'/>    Sign out");
		$(".oidc-signin").click(function (e){
			window.location.href = oidc_server;
		});
	}
}

/**
* asynchronously retrieves OpenID Connect provider config according to the OpenID Connect Discovery specification
* (cf. http://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfigurationRequest).
*
* * @param cb function(obj) callback function retrieving provider config or an error message in case retrieval failed
**/
function getProviderConfig(provider,cb){
	$.ajax(
		provider + '/.well-known/openid-configuration',
	  {
		type: 'GET',
		dataType: 'json',
		complete: function (resp,status) {
			cb(resp.responseJSON);
		},
		error: function (resp, status) {
			cb(status);
		}
	  }
	);
}

/**
* asynchronously retrieves OpenID Connect user info according to the OpenID Connect specification
* (cf. http://openid.net/specs/openid-connect-core-1_0.html#UserInfo). Requires the availability of a valid
* OpenID Connect access token in the browser's local storage ("access_token").
*
* @param cb function(obj) callback function retrieving user info or an error message in case retrieval failed
**/	
function getUserInfo(cb){
	$.ajax(
		oidc_provider_config.userinfo_endpoint,
	  {
		type: 'GET',
		dataType: 'json',
		beforeSend: function (xhr) {
		  xhr.setRequestHeader("Authorization", "Bearer " + window.localStorage["access_token"])
		},
		success: function (userinfo) {
			cb(userinfo);
		},
		error: function (resp) {
			cb(resp.responseJSON);
		}
	  }
	);
}
/**
* TODO: parses OpenID Connect ID token into human-readable JWS according to the OpenID Connect specification
* (cf. http://openid.net/specs/openid-connect-core-1_0.html#IDToken). Requires the availability of a hashed 
* OpenID Connect ID token in the browser's local storage ("id_token"). Token validity is not checked.
**/
/*	
function getOpenIDConnectIdToken() {

	var jws = new KJUR.jws.JWS();
	var result = 0;
	try {
		result = jws.parseJWS(window.localStorage["id_token"]);
	  } catch (ex) {
		//console.log("Warning: " + ex);
	}

	return jws.parsedJWS;
}
*/

/**
* checks for the availability of OpenID Connect tokens (access token and ID token). 
* Returns true, if both tokens are available from the browser's local storage ("access_token" and "id_token").
* Token validity is not checked.
**/		
function checkAuth(){
	// proceeed as defined in http://openid.net/specs/openid-connect-core-1_0.html#ImplicitCallback
	var fragment = parseFragment();
	
	if(fragment != {} && fragment.access_token && fragment.id_token){
		window.localStorage["access_token"] = fragment["access_token"];
		window.localStorage["id_token"] = fragment["id_token"];
	}
	
	if(window.localStorage["access_token"] != null && window.localStorage["id_token"] != null){
		return true;
	} else {
		return false;
	}
}

/**
* parses the current browser window's fragment identifier and its key-value pairs into an object.
* This parsing is especially used for extracting tokens sent by the OpenID Connect provider as a
* redirect to the client after successful authentication and expression of consent in the 
* OpenID Connect implicit flow.
* (cf. http://openid.net/specs/openid-connect-core-1_0.html#ImplicitCallback)
**/
function parseFragment(){
	var params = {}, queryString = location.hash.substring(1), regex = /([^&=]+)=([^&]*)/g, m;
	while (m = regex.exec(queryString)) {
		params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
	}
	return params;
}	