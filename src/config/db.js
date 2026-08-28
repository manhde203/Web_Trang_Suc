const fs = require('fs');
const path = require('path');
require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
	host: process.env.DB_HOST || '127.0.0.1',
	port: Number(process.env.DB_PORT || 3306),
	user: process.env.DB_USER || 'root',
	password: process.env.DB_PASSWORD || '',
	database: process.env.DB_NAME || 'lili_jewelry',
	waitForConnections: true,
	connectionLimit: 10,
	dateStrings: true,
	decimalNumbers: true, // Trả cột DECIMAL (vd: rating) về kiểu number thay vì string
};

const pool = mysql.createPool({
	...dbConfig,
	waitForConnections: true,
	connectionLimit: 10,
	dateStrings: true,
});

async function query(sql, params = [], connection = pool) {
	const [rows] = await connection.execute(sql, params);
	return rows;
}

async function initializeDatabase() {
	const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
	const schema = fs.readFileSync(schemaPath, 'utf8');
	const bootstrapConnection = await mysql.createConnection({
		...dbConfig,
		database: undefined,
	});
	await bootstrapConnection.query(
		`CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(dbConfig.database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
	);
	await bootstrapConnection.end();

	const connection = await pool.getConnection();
	try {
		for (const statement of schema.split(/;\s*(?:\r?\n|$)/).map((part) => part.trim()).filter(Boolean)) {
			try {
				await connection.query(statement);
			} catch (error) {
				if (!['ER_TABLE_EXISTS_ERROR', 'ER_DUP_KEYNAME'].includes(error.code)) throw error;
			}
		}
	} finally {
		connection.release();
	}
}

async function transaction(callback) {
	const connection = await pool.getConnection();
	try {
		await connection.beginTransaction();
		const result = await callback(connection);
		await connection.commit();
		return result;
	} catch (error) {
		await connection.rollback();
		throw error;
	} finally {
		connection.release();
	}
}

module.exports = { pool, query, transaction, initializeDatabase };
