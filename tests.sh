#!/bin/bash

if [ $# -eq 0 ]; then 
    # node load.js tests/json-tests.js
    # node load.js tests/tree-tests.js
    node load.js tests/parser-base-tests.js
    node load.js tests/parser-error-tests.js
    node load.js tests/parser-complex-tests.js
    node load.js tests/parser-ams-tests.js
    exit 0
else
    repeat=$1
fi

i=0
sum=0
while [ $i -lt $repeat ]
do
    sum=$(( $sum + `node load.js tests/parser-tests.js | tail -1 | awk -Fm '{print $1}'`))
    i=$(( $i + 1 ))
done

echo 'Total: ' $sum
average=`bc -l <<< "($sum / $repeat)"`
echo 'Average: ' $average
