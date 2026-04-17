Prerequisites
* Run `Cloud SQL` proxy: `cloud-sql-proxy.exe workondapp:us-central1:free-trial-first-project-integradora-videogame -P 3307`

1. Create a config file (my.cnf) on an arbitrary path
Paste content:
```
[client]
user={db_user}
password={'password'}
host=host.docker.internal
port={port where is running cloud sql proxy}
```

2. Add configuration to prometheus (prometheus.yml) if not added before
```
scrape_configs:
  - job_name: 'mysql_metrics'
    static_configs:
      - targets: ['localhost:9104'] # IP and port where exporter runs
```

3. Execute this command in the directory where my.cnf is placed
```
Command for windows
docker run -d `
  --name mysql-exporter `
  -p 9104:9104 `
  -v "${PWD}/my.cnf:/home/exporter/.my.cnf" `
  prom/mysqld-exporter --config.my-cnf=/home/exporter/.my.cnf
```

4. Execute prometheus with the necessary config
4.1 Add mysql job config
```
prometheus.yml
- job_name: "mysql"
    static_configs:
      - targets: ["localhost:9104"]
```
Then in the termnal
`prometheus.exe --config.file=prometheus.yml`