const cluster = require("cluster");
const numCPUs = require("os").cpus().length;

console.log(numCPUs, ".");

if (cluster.isMaster) {
  console.log(`Master process ${process.pid} is running`);

  // Invite workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Listen for exit events and respawn a new worker if the exit was not deliberate
  cluster.on("exit", (worker, code, signal) => {
    if (code !== 0) {
      console.log(
        `Worker ${worker.process.pid} exited unexpectedly. Respawning...`
      );
      cluster.fork();
    } else {
      console.log(`Worker ${worker.process.pid} exited gracefully.`);
    }
  });
} else {
  // Worker logic
  console.log(`Worker ${process.pid} is ready to do some work`);

  // Simulate some task (calculating square)
  const numberToSquare = Math.floor(Math.random() * 10) + 1;
  const result = numberToSquare * numberToSquare;

  // Log the result
  console.log(
    `Worker ${process.pid}: Square of ${numberToSquare} is ${result}`
  );

  // Worker process exits after completing the task
  process.exit(0);
}
