import { pool } from '../db/pool';
import fs from 'fs';
import path from 'path';

interface Migration {
  id: string;
  name: string;
  sql: string;
}

class MigrationRunner {
  private migrationsDir = path.join(__dirname, '../../migrations');

  async runMigrations(): Promise<void> {
    try {
      console.log('🔄 Starting database migrations...');
      
      // Create migrations table if it doesn't exist
      await this.createMigrationsTable();
      
      // Get list of migration files
      const migrationFiles = this.getMigrationFiles();
      
      // Get already applied migrations
      const appliedMigrations = await this.getAppliedMigrations();
      
      // Run pending migrations
      for (const migration of migrationFiles) {
        if (!appliedMigrations.includes(migration.id)) {
          console.log(`📄 Running migration: ${migration.name}`);
          await this.runMigration(migration);
          console.log(`✅ Migration ${migration.name} completed`);
        } else {
          console.log(`⏭️  Migration ${migration.name} already applied`);
        }
      }
      
      console.log('🎉 All migrations completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  private async createMigrationsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT now()
      );
    `;
    
    await pool.query(query);
  }

  private getMigrationFiles(): Migration[] {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return files.map(file => {
      const id = file.split('_')[0];
      const name = file.replace('.sql', '');
      const sql = fs.readFileSync(path.join(this.migrationsDir, file), 'utf8');
      
      return { id, name, sql };
    });
  }

  private async getAppliedMigrations(): Promise<string[]> {
    const query = 'SELECT id FROM migrations ORDER BY executed_at';
    const result = await pool.query(query);
    return result.rows.map(row => row.id);
  }

  private async runMigration(migration: Migration): Promise<void> {
    try {
      // Start transaction
      await pool.query('BEGIN');
      
      // Execute migration SQL
      await pool.query(migration.sql);
      
      // Record migration as applied
      await pool.query(
        'INSERT INTO migrations (id, name) VALUES ($1, $2)',
        [migration.id, migration.name]
      );
      
      // Commit transaction
      await pool.query('COMMIT');
      
    } catch (error) {
      // Rollback on error
      await pool.query('ROLLBACK');
      throw error;
    }
  }

  async checkMigrationStatus(): Promise<void> {
    try {
      console.log('📊 Checking migration status...');
      
      const migrationFiles = this.getMigrationFiles();
      const appliedMigrations = await this.getAppliedMigrations();
      
      console.log('\nMigration Status:');
      console.log('================');
      
      for (const migration of migrationFiles) {
        const status = appliedMigrations.includes(migration.id) ? '✅ Applied' : '⏳ Pending';
        console.log(`${status} ${migration.name}`);
      }
      
      console.log(`\nTotal: ${migrationFiles.length} migrations`);
      console.log(`Applied: ${appliedMigrations.length}`);
      console.log(`Pending: ${migrationFiles.length - appliedMigrations.length}`);
      
    } catch (error) {
      console.error('❌ Error checking migration status:', error);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const migrationRunner = new MigrationRunner();
  
  try {
    switch (command) {
      case 'run':
        await migrationRunner.runMigrations();
        break;
      case 'status':
        await migrationRunner.checkMigrationStatus();
        break;
      default:
        console.log('Usage:');
        console.log('  npm run migrate:run    - Run pending migrations');
        console.log('  npm run migrate:status - Check migration status');
        break;
    }
  } catch (error) {
    console.error('Migration command failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { MigrationRunner };
