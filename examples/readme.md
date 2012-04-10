PerfectAPI has a unique scaling strategy.  It automatically scales the HTTP load across all available CPUs, and leaves the main process (your code) with its own single CPU that can run in parallel with the HTTP requests and responses.  This example demonstrates how to take that even further and make use of more CPU power for your own code.

Now normally this is not necessary.  It becomes necessary when your own code becomes CPU intensive, e.g. doing mathematical calculations or just having a lot of code behind a single method. 

The example in this folder has 3 files:

 - `fib.json` - describes the example api
 - `fib.js` - the code for the api
 - `fibworker.js` - a file with code that is launched in its own process for calculating a fibonacci sequence
 
There are two techniques demonstrated in the example.  The first (`randomfib2`) demonstrates using a single long-lived worker process to handle all requests.  This has the benefit of insulating the other API methods from the CPU usage of that method.

The second (`randomfib3`) demonstrates launching multiple long-lived worker processes, each of which is used in a round-robin manner.  This makes use of all available CPU.

There are [some benchmarks](http://gist.github.com/2118651) that make use of this example to demonstrate the potential for performance gains under load.