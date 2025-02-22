const express=require("express");
const app=express();
const sqlite3=require("sqlite3");
const {open}=require("sqlite");
const cors=require("cors");
app.use(cors())

app.use(express.json());

let db=null;

const initDb=async ()=>{
    try{
        db=await open({driver:sqlite3.Database,filename:"../database/database.db"});
        await db.run('CREATE TABLE IF NOT EXISTS product_transaction(id INTEGER,title TEXT,price REAL,description TEXT,category TEXT,image TEXT,sold BOOLEAN,month TEXT);')
    }
    catch (e){
        console.log(e);
    }
}

initDb();

app.get("/seedData",async(req,res)=> {
try{
    const response=await fetch("https://s3.amazonaws.com/roxiler.com/product_transaction.json");
    
    const data=await response.json();
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
    data.map(async(each)=>{const {id,title,price,description,category,image,sold,dateOfSale}=each;
    const date=new Date(dateOfSale);
    const month=months[date.getMonth()];
    const query='INSERT INTO product_transaction (id,title,price,description,category,image,sold,month) VALUES(?,?,?,?,?,?,?,?)'
    await db.run(query,[id,title,price,description,category,image,sold,month]);})
    
}
catch(e){
    console.log(e);
}

})

app.get("/allTransactions",async(req,res)=>{
 const {search_q="",page=1,per_page=10,month="March"}=req.query;
    const query='select * from product_transaction where (title LIKE ? OR description LIKE ? OR CAST(price as TEXT) LIKE ?) AND month=? LIMIT ? OFFSET ?'
    const response=await db.all(query,[`%${search_q}%`,`%${search_q}%`,`%${search_q}%`,month,per_page,((page-1)*per_page)]);
    res.send(response);

})


app.get("/statistics",async(req,res)=>{


    const {month="March"}=req.query
    const query=`SELECT SUM(price) as saleamount,COUNT(CASE WHEN sold=1 THEN 1 END) as solditems,COUNT(CASE WHEN sold=0 THEN 1 END) as notsolditems FROM product_transaction where month=?`
    const response=await db.get(query,[month])
    res.send(response)
})
   


app.get("/priceRangeData", async (req, res) => {
        const { month = "March" } = req.query; 
        console.log(month);
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
            WHERE month = ?;
        `;

        const response = await db.get(query, [month]); 
        res.json(response);})


        app.get("/categoryCount", async (req, res) => {
                const { month = "March" } = req.query; 
        
                const query = `
                    SELECT category, COUNT(*) AS item_count
                    FROM product_transaction
                    WHERE month = ?
                    GROUP BY category;
                `;
        
                const response = await db.all(query, [month]);
                res.json(response);
        })




        app.get("/allStatistics", async (req, res) => {
            const { month = "March" } = req.query; 
        
            try {
                const query = `
                    SELECT 
                        SUM(price) AS total_sales,
                        COUNT(CASE WHEN sold = 1 THEN 1 END) AS sold_items,
                        COUNT(CASE WHEN sold = 0 THEN 1 END) AS not_sold_items
                    FROM product_transaction
                    WHERE month = ?;
                `;
                
                const statistics = await db.get(query, [month]);
        
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
                    WHERE month = ?;
                `;
                
                const priceRangeData = await db.get(priceRangeQuery, [month]);
        
                const categoryQuery = `
                    SELECT category, COUNT(*) AS item_count
                    FROM product_transaction
                    WHERE month = ?
                    GROUP BY category;
                `;
        
                const categoryData = await db.all(categoryQuery, [month]);
        
                const finalResponse = {
                    statistics: {
                        total_sales: statistics.total_sales,
                        sold_items: statistics.sold_items,
                        not_sold_items: statistics.not_sold_items,
                    },
                    price_ranges: priceRangeData,
                    categories: categoryData,
                };
        
                res.json(finalResponse);
            } catch (error) {
                console.error("Error fetching combined statistics:", error);
                res.status(500).send("Server error");
            }
        });
        
app.listen(3001,()=>{console.log("app running on http://localhost:3000")});
