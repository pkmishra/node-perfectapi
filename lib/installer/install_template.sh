#!/bin/bash -e

# substitutions that should occur before running:
# 
#   node_modules/amigen/ - root path of module, where files are currently
#   /lib/amigen/bin/amigen.js - final path of bin file
#   amigen - name of service
# 

# add user to run the service
adduser --system --group amigen

# copy files
cp -r node_modules/amigen/ /lib/amigen/
find /lib/amigen -type f -print0 | xargs -I {} -0 chmod 0664 {}
find /lib/amigen -type d -print0 | xargs -I {} -0 chmod 0775 {}
chmod +x /lib/amigen/bin/amigen.js
chown -R amigen /lib/amigen

# setup bin link
ln -s /lib/amigen/bin/amigen.js /usr/local/bin/perfectapi-amigen

# prepare log file
touch /var/log/amigen.log
chmod 0664 /var/log/amigen.log
chown amigen /var/log/amigen.log

# create upstart script
cat >> /etc/init/amigen.conf <<EOF
# perfectapi job - autogenerated by perfectapi installer

author "Steven Campbell <steve@perfectapi.com>"
description "This job will start the amigen service"
version "0.0.1"

respawn limit 10 5
respawn

start on runlevel [2345]
stop on runlevel [016]

exec sudo -H -u amigen sh -c "/usr/local/bin/perfectapi-amigen server -p 3001 >> /var/log/amigen.log 2>&1" 

pre-start script
    # Date format same as (new Date()).toISOString() for consistency
    echo "[`date -u +%Y-%m-%dT%T.%3NZ`] Starting" >> /var/log/amigen.log
end script

pre-stop script

    echo "[`date -u +%Y-%m-%dT%T.%3NZ`] Stopping" >> /var/log/amigen.log
end script

EOF

# start the service
start amigen
