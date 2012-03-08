var objMyPort = {

	googScope: "http://finance.google.com/finance/feeds/",
	googToken: "",
	params: "",
	token: "",
	positionJson: "",
	keyStatsJson: "",
	yqlURL: "http://query.yahooapis.com/v1/public/yql?q=",
	dataFormat: "&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys",

	init: function() {

		$("#login").bind("tap", function() {
			setupMyService();
		});

		//After the page is shown, load the appropriate listview:
		$('[data-role=page]').live('pageshow',function(e, ui){ 

		   page_name = e.target.id;
		   
		   if (page_name == 'home'){
			   objMyPort.checkLogin(e.target.id);
		   }
		   
		   if (page_name == 'detail' && sessionStorage["prior_page"] != 'detail' && sessionStorage["prior_page"] != 'trans'){
				$("#posTitle").html(sessionStorage["portfolio_name"]);
				$("#posMV").html(sessionStorage["portfolio_mv"]);
			 	objMyPort.loadPositions();
		   }

			if (page_name == 'trans'){
				if (sessionStorage["prior_page"] != 'trans') {
				  objMyPort.loadTransactions();
				  objMyPort.buildKeyStats(sessionStorage["position_ticker"]);
				  $("#transTitle").html(sessionStorage["position_name"]);
				}
		   }
		   
		   
		});
		
		$( '#stats' ).live( 'pagebeforeshow',function(event){
			$("#myKeyStatsList").listview("refresh");		   
		});

		//Before the page is hidden, store the name to disable the prior page refresh:
		$('[data-role=page]').live('pagebeforehide',function(e, ui){ 
			sessionStorage["prior_page"] = e.target.id;
		});
		
	},

	checkLogin: function(page_name) {

		objMyPort.googToken = google.accounts.user.checkLogin(objMyPort.googScope);
		
		//If the token is not valid
		if (objMyPort.googToken.length > 0 && page_name == 'home') {
        	
			$('#loginpanel').hide();
			$('#portpanel').show();
			
			if ($("#myPortfoliosList li").length == 0 ) {
				sessionStorage.clear();
				objMyPort.loadPortfolios();
			}
				
		} else {
			$('#loginpanel').show();
			$('#portpanel').hide();
		}

	},
  
	loadPortfolios: function() {
  
  	$("#myPortfoliosList").empty();

		$.mobile.showPageLoadingMsg()
	
		// Google Finance Portfolio Data API Example: Retrieve all Portfolios
		var financeService = new google.gdata.finance.FinanceService('GoogleInc-financejsguide-1.0');
	
		// This callback will run when the portfolio query is complete
		var portfolioFeedCallback = function(result) {
	
		  // An array with all of the users portfolios
		  var entries = result.feed.entry;
	
		  for (var i = 0; i < entries.length; i++) {
	
			var portfolioEntry = entries[i];
			var portfolioData = portfolioEntry.getPortfolioData();
	
			var mv = cost = today_gain = get_gain = 0.00;
			var gain = portfolioData.getGainPercentage();
			var gain_per = portfolioData.gainPercentage;
	
			if (!(typeof portfolioData.getMarketValue()  == "undefined")) {
	
				mv = portfolioData.getMarketValue().getMoney()[0].amount;
					today_gain = portfolioData.getDaysGain().getMoney()[0].amount;
					get_gain = portfolioData.getGain().getMoney()[0].amount;
	
				}
	
			if (!(typeof portfolioData.getCostBasis()  == "undefined")) 
				cost = portfolioData.getCostBasis().getMoney()[0].amount;
	
				var change = today_gain;
				var ch_per = today_gain / mv;
	
				$("#myPortfoliosList").append('<li data-portfolio=\'{"portfolioID":"' + portfolioEntry.id.$t + '","portfolioName":"' + portfolioEntry.title.$t + '","portfolioMV":"' + mv + '"}\'><a href="#" class="lnkPort"><p><label class="dd-pos-sym">' + portfolioEntry.title.$t + '</label></p><p><label class="dd-detail-label">Overall Return:</label><label class="' + GetGainLossClass(portfolioData.returnOverall * 100) + '">' + NumberFormatted(portfolioData.returnOverall * 100, true) + '%</label></p><p class="ui-li-aside"><span class="' + GetGainLossClass(change) + '">' + NumberFormatted(change,true) + '</span>&nbsp;&nbsp;<span class="' + GetGainLossClass(ch_per*100) + '">(' + NumberFormatted(ch_per*100,true) + '%)</span></p></a></li>'); 
	
		 }
	
			$("#myPortfoliosList").listview("refresh");
			objMyPort.refreshListViews();  
			$.mobile.hidePageLoadingMsg();
		};
	
	
		// FinanceService methods may be supplied with an alternate callback for errors
		var handleErrorCallback = function(error) {
		  console.log(error);
		};
	
	
		console.log('Retrieving a list of the user portfolios...');
		var portfolioFeedUri = 'http://finance.google.com/finance/feeds/default/portfolios?returns=true&positions=true';
		financeService.getPortfolioFeed(portfolioFeedUri, portfolioFeedCallback, handleErrorCallback);
	},
	
	
	loadPositions: function() {
	
		$.mobile.showPageLoadingMsg()
	
		$("#myPositionsList").empty();
	
		var financeService = new google.gdata.finance.FinanceService('GoogleInc-financejsguide-1.0');
	
		// This callback will run when the portfolio query is complete
		var portfolioFeedCallback = function(result) {
	
			// An array with all of the users portfolios
			var entries = result.feed.entry;
			var tickerList = "";
	
			//Loop through and get a list of tickers:
			$.each(entries, function(i, val) {
				tickerList = tickerList + entries[i].getSymbol().symbol + ", ";
			});
		  
			//Get the RT Quote info from Yahoo! via YQL:
			var realtimeQ2 = objMyPort.yqlURL + "select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20in%20(%22" + tickerList + "%22)%0A%09%09&"+ objMyPort.dataFormat;
			var rtQuoteData;
	
			$.ajax({
			  url: realtimeQ2,
			  dataType: 'json',
			  data: {},
			  async: false,
			  success: function(json){
				rtQuoteData = json.query.results.quote;
			  }
			});
	
	
		  //Loop thru the Positions in the Portfolio:
		  for (var i = 0; i < entries.length; i++) {
	
			var positionEntry = entries[i];
			var positionData = positionEntry.getPositionData();
				var mv = cost = 0.00;
	
			if (!(typeof positionData.getCostBasis()  == "undefined")) 
				cost = positionData.getCostBasis().getMoney()[0].amount;
	
			if (!(typeof positionData.getMarketValue()  == "undefined"))
				mv = positionData.getMarketValue().getMoney()[0].amount;
	
				//Loop thru the RT Quote data to get the price info:	
				var lastTradePrice, percentChange, changeRT;
				$.each(rtQuoteData, function(j) {
			
					if (rtQuoteData[j].symbol == positionEntry.getSymbol().symbol) {
						lastTradePrice = rtQuoteData[j].LastTradePriceOnly;
						percentChange = rtQuoteData[j].PercentChange;
						changeRT = rtQuoteData[j].ChangeRealtime;
					}
			
				});
	
				//Append the ListItem:
				$("#myPositionsList").append('<li data-position=\'{"positionID":"' + positionEntry.id.$t + '","positionName":"' + positionEntry.title.$t + '","positionTicker":"' + positionEntry.getSymbol().symbol + '"}\'><a href="#" class="lnkPosition"><p><label class="dd-pos-sym">' +  positionEntry.getSymbol().symbol + '</label></p><p><label class="dd-pos-name">' + positionEntry.getTitle().getText() + '</label></p><p><label class="dd-detail-label">Shares:</label><label class="dd-detail-data">' + positionData.getShares() + '</label><label class="dd-detail-label">Return:</label><label class="' + GetGainLossClass(positionData.getGainPercentage() * 100) + '">' + NumberFormatted(positionData.getGainPercentage() * 100,true) + '%</label></p><p class="ui-li-aside"><br /><label class="dd-last-label">Last:</label><label class="dd-last-data">$' + lastTradePrice + '</label><br /><br /><span class="' + GetGainLossClass(changeRT) + '">' + NumberFormatted(changeRT,true) + '</span>&nbsp;&nbsp;<span class="' + GetGainLossClass(percentChange) + '">(' + NumberFormatted(percentChange,true) + '%)</span></p></a></li>');
	
		  }
	
		  $("#myPositionsList").listview("refresh");
		  $.mobile.hidePageLoadingMsg();
	
		};
	
		// FinanceService methods may be supplied with an alternate callback for errors
		var handleErrorCallback = function(error) {
		  console.log(error);
		};
	
		console.log('Retrieving a list of the user positions...');
		var portfolioFeedUri = sessionStorage["portfolio_id"] + '/positions?returns=true';
		console.log(portfolioFeedUri);
	
		financeService.getPositionFeed(portfolioFeedUri, portfolioFeedCallback, handleErrorCallback);
	
	},

	
	loadTransactions: function() {

		$.mobile.showPageLoadingMsg()

		$("#myTransactionList").empty();

		var financeService = new google.gdata.finance.FinanceService('GoogleInc-financejsguide-1.0');

		// This callback will run when the portfolio query is complete
		var transactionFeedCallback = function(result) {

		// An array with all of the users transactions:
		var entries = result.feed.entry;
		
		  for (var i = 0; i < entries.length; i++) {
		
			var transactionEntry = entries[i];
			 var transactionData = transactionEntry.getTransactionData();
			
				//Check if there is only one transaction with 0 shares. This is the Google "seed" transaction:    
				if (entries.length == 1 && transactionData.getShares() == 0) {
				
					$("#myTransactionList").append('<li>You do not have any transactions associated with this Position!</li>');
					break;
				
				} else {
					
					var tran_date = transactionData.getDate().getDate();
					var tran_type = "";
					var tran_shares = tran_price = 0.00;
			
					if (!(typeof transactionData.getType()  == "undefined")) {
						tran_type = transactionData.getType();
						tran_shares = transactionData.getShares();
						tran_price = transactionData.getPrice().getMoney()[0].amount;
					}
		
					$("#myTransactionList").append('<li><p><label class="dd-pos-sym">' +  tran_type + '</label><label class="dd-pos-sym">' +  tran_shares + ' shares on</label><label class="dd-pos-sym">' + FormatDate(tran_date) + '</label><label class="dd-pos-sym">@ $' + NumberFormatted(tran_price, false) + '</label></p></li>');
				}
		}
	  $("#myTransactionList").listview("refresh");
	  $.mobile.hidePageLoadingMsg();

	};

	// FinanceService methods may be supplied with an alternate callback for errors
	var handleErrorCallback = function(error) {
	  console.log(error);
	};

	console.log('Retrieving a list of the transactions...');
	var transactionFeedUri = sessionStorage["position_id"] + '/transactions';
	console.log(transactionFeedUri);

	financeService.getTransactionFeed(transactionFeedUri, transactionFeedCallback, handleErrorCallback);

	},

	buildKeyStats: function(ticker) {

		$("#myKeyStatsList").empty();
	
		//URL to get Stock Quote from YQL:
		var realtimeQ = objMyPort.yqlURL + "select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20in%20(%22" + ticker + "%22)%0A%09%09&"+ objMyPort.dataFormat;
		var rtQuote;
		var ht = "";
		
		$.ajax({
		  url: realtimeQ,
		  dataType: 'json',
		  data: {},
		  async: false,
		  success: function(json){

			ht = ht + "<li data-role='list-divider'>Dividend Information</li>";
			ht = ht + "<li>Dividend Share <span class='ui-li-count'>$" + valueOrDefault(json.query.results.quote.DividendShare,0) + "</span></li>";
			ht = ht + "<li>Dividend Yield <span class='ui-li-count'>" + valueOrDefault(json.query.results.quote.DividendYield,0) + "%</span></li>";
			ht = ht + "<li>Ex-Dividend Date <span class='ui-li-count'>" + valueOrDefault(json.query.results.quote.ExDividendDate) + "</span></li>";
			ht = ht + "<li>Dividend Pay Date <span class='ui-li-count'>" + valueOrDefault(json.query.results.quote.DividendPayDate) + "</span></li>";			
			ht = ht + "<li data-role='list-divider'>Ratios</li> ";
			ht = ht + "<li>EPS <span class='ui-li-count'>" + valueOrDefault(json.query.results.quote.EarningsShare) + "</span></li>";
			ht = ht + "<li>EBITDA <span class='ui-li-count'>" + valueOrDefault(json.query.results.quote.EBITDA) + "</span></li>";
			ht = ht + "<li>Price/Sales <span class='ui-li-count'>" + valueOrDefault(json.query.results.quote.PriceSales) + "</span></li>";
			ht = ht + "<li>Price/Book <span class='ui-li-count'>" + valueOrDefault(json.query.results.quote.PriceBook) + "</span></li>";
			ht = ht + "<li>Price/Earnings <span class='ui-li-count'>" + valueOrDefault(json.query.results.quote.PERatio) + "</span></li>";
			ht = ht + "<li>PEG <span class='ui-li-count'>" + valueOrDefault(json.query.results.quote.PEGRatio) + "</span></li>";
			ht = ht + "<li>Short <span class='ui-li-count'>" + valueOrDefault(json.query.results.quote.ShortRatio) + "</span></li>";
			
			$("#myKeyStatsList").append(ht);
			console.log(ht);
			
			
				
		  }
		});
		
		
	},
	
	refreshListViews: function() {

		$('#myPortfoliosList li').live("tap", function(e) {

			   sessionStorage.setItem("portfolio_id", $(this).jqmData("portfolio").portfolioID);
			   sessionStorage.setItem("portfolio_name", $(this).jqmData("portfolio").portfolioName);
			   sessionStorage.setItem("portfolio_mv", $(this).jqmData("portfolio").portfolioMV);
			   
			   $("#myPositionsList").empty();
			   $.mobile.changePage( "#detail", { transition: "slide"} );

		});
		
		$('#myPositionsList li').live("tap", function(e) {

			   sessionStorage.setItem("position_id", $(this).jqmData("position").positionID);
			   sessionStorage.setItem("position_name", $(this).jqmData("position").positionName);
			   sessionStorage.setItem("position_ticker", $(this).jqmData("position").positionTicker);
			   
			   $("#myTransactionList").empty();
			   $('#myKeyStatsList').empty();
			   $.mobile.changePage( "#trans", { transition: "slide"} );

		});
		

	}

}	//END: objMyPort



	// FinanceService methods may be supplied with an alternate callback for errors
	var handleErrorCallback = function(error) {
	  console.log(error);
	};



	function setupMyService() {

	  var myService = new google.gdata.finance.FinanceService('GoogleInc-financejsguide-1.0');
	  logMeIn();
	  return myService;

	}


	function logMeIn() {

	  scope = "http://finance.google.com/finance/feeds/";
	  objMyPort.googToken = google.accounts.user.login(scope);
	   //$.mobile.changePage( "#home", { transition: "slide"} );
	}


//Function to return a blank if a value is null.
function valueOrDefault(val, def) {
    if (def == undefined) def = "N/A";
    return val == undefined ? def : val;
}

function addCommas(nStr) {
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;

}

function GetGainLossClass(amount) {

	var c = '';
	var i = parseFloat(amount);
	if(isNaN(i)) { i = 0.00; }
	if(i < 0) { cl = 'dd-per-loss'; } else { cl = 'dd-per-gain'; }
	return cl;

}

function FormatDate(dt) {

	var d;
	var curr_date = dt.getDate();
	var curr_month = dt.getMonth();
	curr_month = curr_month + 1;
	var curr_year = dt.getFullYear();
	d = curr_month + '/'+ curr_date + '/'+ curr_year;
	return d;

}

function NumberFormatted(amount, bpre) {

	var i = parseFloat(amount);
	if(isNaN(i)) { i = 0.00; }
	var minus = '';
	if(i < 0) { minus = '-'; } else { if(bpre) { minus = '+'; } }
	i = Math.abs(i);
	i = parseInt((i + .005) * 100);
	i = i / 100;
	s = new String(i);
	if(s.indexOf('.') < 0) { s += '.00'; }
	if(s.indexOf('.') == (s.length - 2)) { s += '0'; }
	s = minus + s;
	return addCommas(s);

}

// end of function NumberFormatted()
