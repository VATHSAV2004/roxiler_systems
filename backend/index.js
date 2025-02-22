const express = require("express");
const sqliteCloud = require("sqlite-cloud");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const client = sqliteCloud.connect("cbxaamq5hk.g4.sqlite.cloud", "FhMbbM0Ivjm9zMlD9IKdk0BX97UaJ6oAPaemSQnDJXI");

const initDb = async () => {
    try {
        await client.run(`
            CREATE TABLE IF NOT EXISTS product_transaction (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT,
                price REAL,
                description TEXT,
                category TEXT,
                image TEXT,
                sold BOOLEAN,
                month TEXT
            );
        `);
        console.log("Database connected successfully!");
    } catch (error) {
        console.error("Database connection failed:", error);
    }
};

initDb();

app.get("/seedData", async (req, res) => {
    try {
        const response = await fetch("https://s3.amazonaws.com/roxiler.com/product_transaction.json");
        const data = await response.json();
        const months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        for (const each of data) {
            const { id, title, price, description, category, image, sold, dateOfSale } = each;
            const date = new Date(dateOfSale);
            const month = months[date.getMonth()];
            const query = `
                INSERT INTO product_transaction (id, title, price, description, category, image, sold, month)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            await client.run(query, id, title, price, description, category, image, sold, month);
        }

        res.send({ message: "Data seeded successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error seeding data");
    }
});

app.get("/allTransactions", async (req, res) => {
    const { search_q = "", page = 1, per_page = 10, month = "March" } = req.query;
    try {
        const query = `
            SELECT * FROM product_transaction
            WHERE (title LIKE ? OR description LIKE ? OR CAST(price AS TEXT) LIKE ?) AND month=?
            LIMIT ? OFFSET ?
        `;
        const response = await client.all(query, `%${search_q}%`, `%${search_q}%`, `%${search_q}%`, month, per_page, (page - 1) * per_page);
        res.send(response);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching transactions");
    }
});

app.get("/statistics", async (req, res) => {
    const { month = "March" } = req.query;
    try {
        const query = `
            SELECT 
                SUM(price) AS saleamount,
                COUNT(CASE WHEN sold=1 THEN 1 END) AS solditems,
                COUNT(CASE WHEN sold=0 THEN 1 END) AS notsolditems
            FROM product_transaction WHERE month=?
        `;
        const response = await client.get(query, month);
        res.send(response);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching statistics");
    }
});

app.get("/priceRangeData", async (req, res) => {
    const { month = "March" } = req.query;
    try {
        const query = `
            SELECT 
                COUNT(CASE WHEN price BETWEEN 0 AND 100 THEN 1 END) AS range_0to100,
                COUNT(CASE WHEN price BETWEEN 101 AND 200 THEN 1 END) AS range_101to200,
                COUNT(CASE WHEN price BETWEEN 201 AND 300 THEN 1 END) AS range_201to300,
                COUNT(CASE WHEN price BETWEEN 301 AND 400 THEN 1 END) AS range_301to400,
                COUNT(CASE WHEN price BETWEEN 401 AND 500 THEN 1 END) AS range_401to500,
                COUNT(CASE WHEN price BETWEEN 501 AND 600 THEN 1 END) AS range_501to600,
                COUNT(CASE WHEN price BETWEEN 601 AND 700 THEN 1 END) AS range_601to700,
                COUNT(CASE WHEN price BETWEEN 701 AND 800 THEN 1 END) AS range_701to800,
                COUNT(CASE WHEN price BETWEEN 801 AND 900 THEN 1 END) AS range_801to900,
                COUNT(CASE WHEN price >= 901 THEN 1 END) AS range_901_above
            FROM product_transaction
            WHERE month = ?
        `;
        const response = await client.get(query, month);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching price range data");
    }
});

app.get("/categoryCount", async (req, res) => {
    const { month = "March" } = req.query;
    try {
        const query = `
            SELECT category, COUNT(*) AS item_count
            FROM product_transaction
            WHERE month = ?
            GROUP BY category
        `;
        const response = await client.all(query, month);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching category count");
    }
});

app.get("/allStatistics", async (req, res) => {
    const { month = "March" } = req.query;
    try {
        const query = `
            SELECT 
                SUM(price) AS total_sales,
                COUNT(CASE WHEN sold = 1 THEN 1 END) AS sold_items,
                COUNT(CASE WHEN sold = 0 THEN 1 END) AS not_sold_items
            FROM product_transaction
            WHERE month = ?
        `;
        const statistics = await client.get(query, month);

        const priceRangeQuery = `
            SELECT 
                COUNT(CASE WHEN price BETWEEN 0 AND 100 THEN 1 END) AS range_0to100,
                COUNT(CASE WHEN price BETWEEN 101 AND 200 THEN 1 END) AS range_101to200,
                COUNT(CASE WHEN price BETWEEN 201 AND 300 THEN 1 END) AS range_201to300,
                COUNT(CASE WHEN price BETWEEN 301 AND 400 THEN 1 END) AS range_301to400,
                COUNT(CASE WHEN price BETWEEN 401 AND 500 THEN 1 END) AS range_401to500,
                COUNT(CASE WHEN price BETWEEN 501 AND 600 THEN 1 END) AS range_501to600,
                COUNT(CASE WHEN price BETWEEN 601 AND 700 THEN 1 END) AS range_601to700,
                COUNT(CASE WHEN price BETWEEN 701 AND 800 THEN 1 END) AS range_701to800,
                COUNT(CASE WHEN price BETWEEN 801 AND 900 THEN 1 END) AS range_801to900,
                COUNT(CASE WHEN price >= 901 THEN 1 END) AS range_901_above
            FROM product_transaction
            WHERE month = ?
        `;
        const priceRangeData = await client.get(priceRangeQuery, month);

        const categoryQuery = `SELECT category, COUNT(*) AS item_count FROM product_transaction WHERE month = ? GROUP BY category`;
        const categoryData = await client.all(categoryQuery, month);

        res.json({ statistics, price_ranges: priceRangeData, categories: categoryData });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching all statistics");
    }
});

app.listen(3001, () => console.log("App running on http://localhost:3001"));
