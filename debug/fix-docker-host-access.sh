#!/bin/bash

# This script helps ensure Docker containers can access services running on the host machine
# It adds a firewall rule to allow Docker containers to access the host on port 11435

echo "Ensuring Docker containers can access host on port 11435..."

# For macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "Detected macOS system"
  
  # Check if port is already open
  if sudo lsof -i :11435 | grep LISTEN; then
    echo "Port 11435 is already in use. Make sure your proxy is running on this port."
  else
    echo "Port 11435 is available."
  fi
  
  echo "On macOS, Docker Desktop should automatically handle host.docker.internal routing."
  echo "If you're still having issues, try restarting Docker Desktop."

# For Linux
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  echo "Detected Linux system"
  
  # Get Docker bridge network IP
  DOCKER_BRIDGE_IP=$(docker network inspect bridge --format='{{range .IPAM.Config}}{{.Gateway}}{{end}}')
  
  if [ -z "$DOCKER_BRIDGE_IP" ]; then
    echo "Error: Could not determine Docker bridge IP."
    exit 1
  fi
  
  echo "Docker bridge IP: $DOCKER_BRIDGE_IP"
  
  # Add iptables rule to allow access from Docker containers to host
  echo "Adding iptables rule to allow Docker containers to access host on port 11435..."
  sudo iptables -t nat -A DOCKER -p tcp --dport 11435 -j DNAT --to-destination 172.17.0.1:11435
  
  echo "Rule added. Docker containers should now be able to access the host on port 11435."
  
  # Make the rule persistent (Ubuntu/Debian)
  if command -v iptables-save > /dev/null; then
    echo "Making iptables rule persistent..."
    sudo iptables-save > /etc/iptables/rules.v4
  fi
  
  echo "You may need to update your Docker Compose file to use 'host.docker.internal' or '$DOCKER_BRIDGE_IP' instead."

# For Windows
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  echo "Detected Windows system"
  echo "On Windows with Docker Desktop, host.docker.internal should work automatically."
  echo "If you're still having issues, try restarting Docker Desktop."
  
# Unknown OS
else
  echo "Unknown operating system: $OSTYPE"
  echo "Please manually ensure that Docker containers can access the host on port 11435."
fi

echo "Done." 