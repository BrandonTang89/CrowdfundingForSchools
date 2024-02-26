# Database
We will use PostgreSQL for the database. 

## Database Setup
We can set up the database locally using Docker.
```
sudo dockerd
sudo docker pull postgres
sudo docker run --name mypostgres -e POSTGRES_PASSWORD=hellohello -d -p 5432:5432 postgres
```

### Creating Our Database
We can create our database layout using the following commands:
```
psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE crowdfundingsitedb"
psql -h localhost -p 5432 -U postgres -d crowdfundingsitedb -f sqlscripts/createDatabase.sql
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
- defaultschool: String, Name of school they would like to be the default

### Schools Table
- **School** : String, Name of school
- stripeid: String, Stripe connected account id
- onboarded: Boolean, Whether the school has completed the onboarding process

### Roles Table
Stores the roles of administrators and teachers for each school. Administrators can promote and demote teachers/other administrators for a school. Teachers (and administrators) can propose, approve, modify, open/close and delete projects for their school.

- **userid** : String, Firebase Auth UID
- **school** : String, Name of school
- role : Enum("admin", "teacher")

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
