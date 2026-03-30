import { ttlCache, redis } from './main.js';

function generateData(sizeKB: number) { /* Data generator for variations. */
  const str = 'x'.repeat(sizeKB * 1024);
  return { data: str, sizeKB, id: Math.random() };
}
/*Line 2-5 explained
line 2: initiating a fucntion called generateData that takes in a parameter called sizeKB of type number. 
line 3: within the function a constant is declared called str. This constant is assigned a string value of "x" repeated a number of ties equal to the parameter that was passed in (sizeKB) multiplied by 1024. The purpose of this is to create a string of the size of the amount of data trasnfered or retrieved and compare that data to the how the computer would normally go an retrive cahced data. 
line 4: the function then returns  an object with 3 properties. the first property is the data, which is the result of the string we just created in line 3. this property has the data type of string. The second property is sizeKB and this has the data type of a number it is not listed because it has been named in a prior line somewhere in the application. The third property is id which is assigned a random number using Math.random(). this is not really an effceint way of getting this done as cyptro.randomUUID() would be a better way to get a unique id but tis is just for testing purposes and the id is not used for anything in the application.
*/

async function benchmark() { /* Async main. */
  console.log('Benchmark: OSP Cache Variations (small/medium/large)\\n');

  /*lines 13-14 explained
  line 13: this is the beginning of the main function that runs the benchmark test. 
  line 14: this is what the user would see in the terminal when they run the npm run benchmark script. it is just a header to let the user know what they are looking at and that the test is about to begin. 
  */

  const SIZES = [0.5, 5, 10, 50]; /* Small/medium/large test TTL tiers. */
  const RUNS = 10; /* Runs per test. */

  /* lines 21-22 explained
  line 21: a constant variable is declared called SIZES and it is assigned an arrray of numbers. These numbers are the numbers that are going to be used within the benchmark test to determine the size of the data that is being transfered or retrived. These numbers represent the size of the data in kilobytes. 
  The first number is 0.5 which represents 500 bytes, the second number is 5 which represents 5 kilobytes. the 3rd # is 10 which represents 10KB. the 4th # is 50 which represents 50KB. These numbers are used to test the different tiers of TTL that are set within the dynamicTTL function in the main.ts file.
  line 22: a constant variable is declared called RUNS and it is assigned the value of 10. This variable determines how many times each test is going to be run. allows us to get an average time for each test. also, it allows us to see if there are any outliers in the data. If we only ran each test once we would not be able to get an accurate representation of the performance of the cache because there could be a lot of variability in the time it takes to retrieve data from the cache or from the origin. 
  */ 

  for (const sizeKB of SIZES) { /* Loop sizes. */
    const key = `bench:${sizeKB}KB`;

    /* lines 30-31 explained
    line 30: a constant variable is declared called key and it is assigned a string value that combines the prefix "bench:" with the size of the data in kilobytes.
    line 31: this is where the key is used to store and retrieve data from the cache.
    */

    console.log(`\\n--- ${sizeKB}KB ---`);
    /* lines 38-40 explained
    line 38: this is where the size of the data in kilobytes is logged to the terminal. this is just for the user to know which test is currently running and what size of data is being transfered or retrived. it is just a header for each test. 
    the \\n is used to create a new line before the header so that it is easier to read in the terminal.
    */

    // Origin baseline
    console.time(`Origin-${sizeKB}KB`);
    let originTotal = 0;
    for (let i = 0; i < RUNS; i++) {
      const start = performance.now();
      await new Promise(r => setTimeout(r, 1000)); /* Slow sim. */
      originTotal += performance.now() - start;
    }

    /* lines 45-51
  line 45: this is the text that shows up in the console log to indicat the beginning of the origin test. This is the baseline that is used to compaare the cache performance to. This is basically the control in our benchmark to see if the cache is actually improving performance or not.
  line 46: a varibale of originTotal is templaorialy declared and assigned the value of 0. This variable is used to keep track of the total time it takes to retrive data from the origin and it is used to caculate the time it 
     */

    console.timeEnd(`Origin-${sizeKB}KB`);
    console.log(`Avg: ${(originTotal/RUNS).toFixed(0)}ms`);

    /* lines - */

    // Cache test
    console.time(`Cache-${sizeKB}KB`);
    let cacheTotal = 0;
    for (let i = 0; i < RUNS; i++) {
      const start = performance.now();
      await ttlCache(key, () => Promise.resolve(generateData(sizeKB)), { priority: 'medium' }); /* Hit after first. */
      cacheTotal += performance.now() - start;
    }

    /* lines - 
    
    */

    console.timeEnd(`Cache-${sizeKB}KB`);
    console.log(`Avg: ${(cacheTotal/RUNS).toFixed(0)}ms`);
    console.log(`Speedup: ${((originTotal / cacheTotal - 1) * 100).toFixed(0)}%`);
  }

  /* lines - 
  
  */

  console.log('\\nKeys:');
  const { Redis } = await import('ioredis');
  const tempRedis = new Redis();
  const keys = await tempRedis.keys('*');
  console.log(keys);
  tempRedis.quit();
}

/* lines - 
*/

benchmark().finally(async () => {
  await redis.disconnect();
  process.exit(0);
});

