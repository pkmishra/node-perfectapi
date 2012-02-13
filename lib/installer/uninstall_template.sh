#!/bin/bash

# substitutions that should occur before running:
# 
#   876uyghjhsadadsf - name of service
# 

stop 876uyghjhsadadsf
rm /usr/local/bin/perfectapi-876uyghjhsadadsf
rm /etc/init/876uyghjhsadadsf.conf
rm -fr /lib/876uyghjhsadadsf
deluser --remove-home --system 876uyghjhsadadsf
deluser --system --group 876uyghjhsadadsf

# and that, my friends is the laziest uninstall you'll ever see