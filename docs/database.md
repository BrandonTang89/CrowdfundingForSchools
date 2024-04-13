# Database
We will use PostgreSQL for the database. 

### Installing Docker and PostgreSQL
You can download Docker here: https://www.docker.com/products/docker-desktop/
And PostgresSQL here: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
- Choose port 5432 when prompted
- You will be asked for a password which you will need to remember to run the code later
- At least on Windows, you also need to add PostgreSQL to the PATH environement variable as described here: https://stackoverflow.com/questions/30401460/postgres-psql-not-recognized-as-an-internal-or-external-command
    - Search for 'Environment variables' in your computer searchbar
    - Click 'Environment variables', then under 'System variables' double-click 'PATH'
    - Click 'New', and enter C:\Program Files\PostgreSQL\16\bin or wherever this file is stored, replacing 16 with your PostgreSQL version
    - Repeat to add C:\Program Files\PostgreSQL\16\lib
    - Click OK
    - Restart your terminal/whatever software you're in

## Database Setup
We can set up the database locally using Docker.
**Note:** I needed to be have Docker Desktop open on your computer
Linux:
```
sudo dockerd
sudo docker pull postgres
sudo docker run --name mypostgres -e POSTGRES_PASSWORD=hellohello -d -p 5432:5432 postgres
```
Windows:
```
docker pull postgres
docker run --name mypostgres -e POSTGRES_PASSWORD=hellohello -d -p 5432:5432 postgres
```

### Creating Our Database
We can create our database layout using the following commands:
```
psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE crowdfundingsitedb"
psql -h localhost -p 5432 -U postgres -d crowdfundingsitedb -f sqlscripts/createDatabase.sql
psql -h localhost -p 5432 -U postgres -d crowdfundingsitedb -f sqlscripts/addDummyData.sql
```

### Quick Docker Commands
- `sudo docker ps` lists the running containers
- `sudo docker stop [container_id]` stops the container
- `sudo docker start [container_id]` starts the container
- `sudo docker remove [container_id]` removes the container
- `sudo docker exec -it [container_id] /bin/bash` enters the container

### Connecting to the Database
- Within the docker container running the database server we can use the following commands:
    - `psql -U postgres` enters the psql shell
    - `psql -U postgres -d [database_name]` enters the psql shell for a specific database
- Outside the docker container (from the host machine) we can use the following commands:
    - `psql -h localhost -U postgres` enters the psql shell
    - `psql -h localhost -U postgres -d [database_name]` enters the psql shell for a specific database
    - Note that we will need to type the password to enter the shell.

### Quick PostgreSQL Commands
- `\l` lists the databases
- `\c [database_name]` connects to a database
- `\dt` lists the tables
- `\d [table_name]` describes the table
- `\q` quits the shell
- `DROP DATABASE [database_name];` deletes the database
- `DROP TABLE [table_name];` deletes the table
- `SELECT * FROM [table_name];` lists the rows in the table


## Database Schema
The following is the schema, with primary key(s) in bold.
### User Table
Stores personal user data
- **userid** : String, Firebase Auth UID
- email: String, user's email
- defaultschool: String, Name of school they would like to be the default

### Schools Table
- **School** : String, Name of school
- stripeid: String, Stripe connected account id. Default is null, if they have not set up a Stripe
- onboarded: Boolean, Whether the school has completed the onboarding process

### Roles Table
Stores the roles of administrators and teachers for each school as well as users who have favourited a school. Administrators can promote and demote teachers/other administrators for a school. Teachers (and administrators) can propose, approve, modify, open/close and delete projects for their school. Favouriters have no admin rights to a school.

- **userid** : String, Firebase Auth UID
- **school** : String, Name of school
- role : Enum("admin", "teacher", "favourite")

### Projects Table
Stores the projects that are to be funded
- **projectid** : Serial, Unique identifier for the project, randomly generated
- school: String, Name of school
- title: String, Title of the project
- desciption: String, Description of the project
- goalmoney: Integer, Amount of money to be raised in pounds
- current: Integer, Amount of money donated so far in pounds
- mindonation: Integer, Minimum amount of money that can be donated at once
- status: Enum("proposed", "open", "closed")
- proposer: String, Firebase Auth UID of the proposer

### Donations Table
Stores the list of donations made to projects
- **donationid** : Serial, Unique identifier for the donation, randomly generated
- projectid: Integer, Unique identifier for the project
- userid: String, Firebase Auth UID
- amount: Integer, Amount of money donated
- donationdate: Date, Date of donation


## Database References
- https://stackoverflow.com/questions/37694987/connecting-to-postgresql-in-a-docker-container-from-outside
