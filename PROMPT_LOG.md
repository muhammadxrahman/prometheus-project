# Prompt Log

Using Claude Code Opus 5.5 Medium

## 1. Intraday endpoint
Prompt:
```text
Consider the following 3rd party endpoint call:
curl "https://query1.finance.yahoo.com/v8/finance/chart/TSLA?interval=15m" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
{"chart":{"result":[{"meta":{"currency":"USD","symbol":"TSLA","exchangeName":"NMS","fullExchangeName":"NasdaqGS","instrumentType":"EQUITY","firstTradeDate":1277818200,"regularMarketTime":1792180801,"hasPrePostMarketData":true,"gmtoffset":-14400,"timezone":"EDT","exchangeTimezoneName":"America/New_York","regularMarketPrice":354.72,"regularMarketChangePercent":-2.13,"fulldayPrice":354.72,"fulldayChange":-9.98,"fulldayChangePercent":-2.754,"fiftyTwoWeekHigh":498.83,"fiftyTwoWeekLow":297.38,"regularMarketDayHigh":370.58,"regularMarketDayLow":349.33,"regularMarketVolume":61706132,"longName":"Tesla, Inc.","shortName":"Tesla, Inc.","chartPreviousClose":362.44,"previousClose":362.44,"scale":3,"priceHint":2,"currentTradingPeriod":{"pre":{"timezone":"EDT","end":1792157400,"start":1792137600,"gmtoffset":-14400},"regular":{"timezone":"EDT","end":1792180800,"start":1792157400,"gmtoffset":-14400},"post":{"timezone":"EDT","end":1792195200,"start":1792180800,"gmtoffset":-14400}},"tradingPeriods":[[{"timezone":"EDT","end":1792180800,"start":1792157400,"gmtoffset":-14400}]],"dataGranularity":"15m","range":"1d","validRanges":["1d","5d","1mo","3mo","6mo","1y","2y","5y","10y","ytd","max"]},"timestamp":[1792157400,1792158300,1792159200,1792160100,1792161000,1792161900,1792162800,1792163700,1792164600,1792165500,1792166400,1792167300,1792168200,1792169100,1792170000,1792170900,1792171800,1792172700,1792173600,1792174500,1792175400,1792176300,1792177200,1792178100,1792179000,1792179900,1792180800],"indicators":{"quote":[{"volume":[11459573,4049234,3241759,2811399,2983013,2550726,2264320,1685648,1719006,1019044,1458428,1220967,1004910,1978126,1721029,1975242,1487390,786577,819007,1171451,1368646,1148503,1335290,1189263,1080356,3949628,0],"high":[370.57989501953125,370.2799987792969,370.20001220703125,369.3399963378906,365.7300109863281,365.1700134277344,361.9798889160156,360.5,360.31988525390625,359.8699951171875,359.0,358.81988525390625,357.2195129394531,357.04998779296875,354.99810791015625,353.2998962402344,354.351806640625,354.3999938964844,353.44000244140625,352.89990234375,352.04901123046875,351.2398986816406,352.75,353.0400085449219,352.2351989746094,355.3999938964844,354.7200012207031],"open":[369.0400085449219,368.7950134277344,366.739990234375,368.75,364.510009765625,363.9714050292969,361.3299865722656,360.1300048828125,358.3999938964844,359.1499938964844,358.05999755859375,358.7300109863281,356.9200134277344,356.8949890136719,354.92999267578125,352.7300109863281,352.9700927734375,354.1549987792969,353.4100036621094,352.7200012207031,351.9049987792969,350.9100036621094,350.8399963378906,352.7080078125,351.9800109863281,351.8500061035156,354.7200012207031],"low":[364.15008544921875,363.3699951171875,365.8203125,363.70111083984375,362.5,360.20001220703125,359.2799987792969,357.5,358.3299865722656,357.82000732421875,356.8800048828125,356.7799987792969,356.260009765625,354.510009765625,351.92059326171875,351.1400146484375,352.3999938964844,352.8999938964844,352.10009765625,351.2699890136719,350.3999938964844,349.8500061035156,349.3299865722656,351.4700012207031,350.95001220703125,351.739990234375,354.7200012207031],"close":[368.8528137207031,366.739990234375,368.67999267578125,364.5199890136719,363.94000244140625,361.32501220703125,360.1400146484375,358.3699951171875,359.1099853515625,358.05499267578125,358.7300109863281,356.9200134277344,356.8900146484375,354.92999267578125,352.7250061035156,353.07000732421875,354.0899963378906,353.4549865722656,352.7099914550781,351.8599853515625,350.9200134277344,350.840087890625,352.69500732421875,351.95001220703125,351.8299865722656,354.6700134277344,354.7200012207031]}]}}],"error":null}}%
In app.js, create an endpoint that takes a ticker as a param, queries intraday data from the last month, and groups results by day. We want it to return the json format like this: 
[
{
"day": "2009-01-30",
"lowAverage": 40.2958,
"highAverage": 49.7534,
"volume": 49073348
}
]

Focus on a bare bones endpoint without extras.
```

Why: I had a simple backend folder with npm init and express installed. Just a simple app.js with a health endpoint. Since I know what data I need to return, I asked for a scoped request that can be easily changed

Outcome: Took the 34 lines for `GET /intraday/:ticker`, as it meets the viable standard for req/res

## 2. Symbol validation
Prompt:
```text
Slot a validator in the get ticker request, right before the fetch. It's not feasible to give a list of couple thousands of valid stock symbols, so instead implement a validation that checks for conventations of a symbol name being met. Additionally, inside /backend/tests create a simple test script with a valid request and an unvalid.
```

Why: Need to check request param validity before Yahoo API is hit; not feasible to store thousands of symbols that get listed/delisted. Regex expressions can help here

Outcome: Changed the regex. The generated one rejected indices like `^GSPC`.
- Generated: `/^[A-Z]{1,5}([.-][A-Z]{1,2})?$/`
- Replaced with: `/^[A-Z0-9^][A-Z0-9.=^-]{0,14}$/`

## 3. TypeScript migration
Prompt:
```text
As backend stands now, do a migration to typescript and add tsx watch for backend file changes and server restarts
```

Why: Project expects TypeScript on frontend. Unifying the language on the backend would would expectations on data. File watching is convenient for regular changes and on demand testing via curl or suite.

Outcome: Accepted the change after tests passing. Early language decisions avoid messes down the road.

## 4. Caching plan
Prompt:
```text
Read the current app.ts. Task: extract the fetch, parse, and aggregate logic into getIntraday(ticker) with no behavior change, then wrap it with an lru-cache instance using fetch() so concurrent identical requests share one upstream call. Constraints: key is ticker:1mo:15m, cache aggregated rows only, TTL and max from env with defaults of 5 minutes and 500, do not cache failures, add an X-Cache header. Out of scope: Redis, cache interface, negative caching, rate limiting, new routes. Acceptance: existing tests pass unchanged, plus tests for sequential hit, concurrent single call, failure not cached, and TTL expiry. Give me a plan first.
```

Why: Used a Sonnet 5.5 Medium chat to write out this prompt. This is where over engineering becomes an issue, especially when using an LLM to implement production-ready features. I want to constrain what is implemented when my goal is a simple cache of requested symbols based on the time. 

Outcome: Accepted the applied logic. It should be noted as I still need to work on understanding race conditions. As I understand, the first request claims the cache slot with its in-flight promise before it yields at await. Later requests for the same key find that claim and wait on the same promise instead of starting their own Yahoo call.

## 5. Yahoo API timeouts
Prompt:
```text
Implement a timeout on getIntraday for Yahoo. Wrap the fetch and response.json() with the helpers to return a 504 if the request times out. 8 sec default
```

Why: A timeout on responses from Yahoo hasn't been implemented yet. Any server side issues from the third party need to be gracefully addressed with an error. Reusing helpers make it easier to maintain

Outcome: Keeping the output as it's a simple try/catch implementation that throws the desired error. Tests are passing.

## 6. Ratelimiting GET /intraday/:ticker
```text
Implement a simple rate limiter on our get /intraday/:ticker that's configurable
```

Why: Need a way to stop constant requests from the same IP. A rate limiter should be usable as a dependency on the endpoint function. I specifically asked for it to be done on this request and not globally because I don't want to limit /health for now. Otherwise, I would extract it as a configurable class with specified limits per request. 

Outcome: Output came as a helper function of express-rate-limit setup that is passed into the GET request as a dependency. I changed it to 10 requests per minute. intradayRateLimit can be reused for the same limits for any extra endpoints on symbols, but for now we're good.

## 7. Last minute error handling, frontend prep
```text
Address any possible errors remaining that could come from the Yahoo api and add graceful handling on the backend. Once that is completed we will open up the middleware for the frontend to make requests.
```

Why: Looking to add final pieces of errors to be addressed and parsed into JSON for the frontend to read. These include DNS network issues that I just had when I was CURL testing. Yahoo-specific rate limiting instead of just our own rate limiting needs to be addressed as well.

Outcome: Accepted the additions and validated that the new tests pass.

## 8. Frontend plan
```text
Take a look at /frontend that was built with npm create vite with react. I propose Bootstrap for CSS. Prioritize maintainability so don't look at app.tsx for the content but rather another file that'll hold this and be pointed to. For now plan a single page frontend that will make requests to our backend.
```

Why: Frontend design, especially CSS isn't my strong suit. By deliberating a plan of attack for a single page, we get to address the main goals first before we get into the styling. 

Outcome: Plain old Bootstrap and the following src/ structure were proposed:
```
src/
  main.tsx                    Bootstrap CSS import + <App />
  App.tsx                     shell only: <IntradayPage />
  pages/IntradayPage.tsx      lays out the page, owns no fetch logic
  components/
    TickerForm.tsx            input + submit, uppercases, quick format check
    IntradayTable.tsx         rows → table, number formatting, empty state
    ErrorAlert.tsx            Bootstrap alert for an error message
  hooks/useIntraday.ts        request state: idle | loading | success | error
  api/intraday.ts             fetchIntraday(ticker, signal), ApiError, IntradayRow type

```
I decided to skip frontend automation tests and focus on unit testing the API. Vite dev proxy was proposed for communication, but simple CORS would be viable for this scope.


## 9. Implementing calls to backend
```text
For now, implement the API, open the backend CORS policy, and add unit testing on the frontend calls. We will add the page and content after this is verified.
```

Why: Basing on the output plan of the last prompt, I wanted to build it in parts so that I can follow along easily without large chunks being unreviewed.

Outcome: Accepted the changes, but saw that the CORS policy accepted all methods, not just GET. 

## 10. Cleanup of frontend and CORS fix
```text
Go ahead and lock down to only GET requests on the backend CORS rules. Additionally, clean up the demo assets and files that were added by the npm create vite command.
```

Why: Lock down of the CORS policy. Cleaning of demo assets so that we have a lightweight bundle.

Outcome: Accepted the pages.

## 11. Oneshotting main page and helpers
```text
Import the Bootstrap library in main.tsx. Implement a single IntradayPage.tsx page in frontend/src/pages. Use frontend/src/components to hold: 1. the request form with quick format checking and input cleaning. 2. a table to display the data. 3. an error alert for error messages. App.tsx will hold IntradayPage.tsx
```

Why: This is the part where we start adding the real content. Admittedly, frontend is not my strong suit outside of setting up states, helper functions, and API setup. This prompt is to address all of that into patching a single page that's broken down with components and helpers. The idea is that we need to break it part so that it's easier to add to later.

Outcome: Accepted the changes as is after testing manually.

## 12. Implementing a chart view
```text
Implement a chart view for the page. Let it be that the user can switch between the table and the chart. Go for a shaded band between low avg and high avg for each day that show the daily range and its trend, volume bars along the bottom on their own axis, and a tooltip showing all three values for the day under the cursor.
```

Why: Chart building on the frontend seems very confusing, and I'm not familiar with the right tools. By instead focusing on what I want it to look like, the LLM can find a matching library that implements the specs I've chosen.

Outcome: Accepted the chart addition using Recharts and verified that it looks nice. Trending line chart on top and a volume bar on the bottom with labeling. Honestly looks beautiful to me.

## 13. README directions
```text
Fill the root level README with setup information of both the frontend and backend. Avoid docker-compose as it's very light at the moment. Also denote the configurable rate limiting.
```

Why: This is were LLMs shine. Taking the package.json scripts and API setups, Claude or any LLM can reiterate the setup of servers and configurable values. It also looks at dependencies used by the project to consider what may be forgotten such as Node.js versions. 

Outcome: Accepted the README output.

