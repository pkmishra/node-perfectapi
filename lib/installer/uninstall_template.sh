#!/bin/bash -x

# substitutions that should occur before running:
# 
#   amigen - name of service
# 

if [[ $EUID -ne 0 ]]; then
echo "This script must be run as root or using sudo" 1>&2
exit 1
fi

stop amigen
rm /usr/local/bin/perfectapi-amigen
rm /etc/init/amigen.conf

# and that, my friends is the laziest uninstall you'll ever see