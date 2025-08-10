create table subscriber (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    subscription_date DATE DEFAULT (CURRENT_DATE()),
    PRIMARY KEY (id)
);