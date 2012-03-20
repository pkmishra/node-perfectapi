module.exports = fibonacci;

process.on('message', function(m) {
  var n = m.n;
  var id = m.id;
  var result;
  
  if (n < 2) {
    result = 1
  } else {
    result = fibonacci(n-2) + fibonacci(n-1)
  }
  
  process.send({id: id, result: result});
})

function fibonacci(n) {
  if (n < 2)
    return 1;
  else
    return fibonacci(n-2) + fibonacci(n-1);
}

