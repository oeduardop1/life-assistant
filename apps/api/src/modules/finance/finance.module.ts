// apps/api/src/modules/finance/finance.module.ts

import { Module } from '@nestjs/common';
import { LoggerModule } from '../../logger/logger.module';

// Controllers
import { IncomesController } from './presentation/controllers/incomes.controller';
import { BillsController } from './presentation/controllers/bills.controller';
import { VariableExpensesController } from './presentation/controllers/variable-expenses.controller';
import { DebtsController } from './presentation/controllers/debts.controller';
import { InvestmentsController } from './presentation/controllers/investments.controller';
import { FinanceSummaryController } from './presentation/controllers/finance-summary.controller';

// Services
import { IncomesService } from './application/services/incomes.service';
import { BillsService } from './application/services/bills.service';
import { VariableExpensesService } from './application/services/variable-expenses.service';
import { DebtsService } from './application/services/debts.service';
import { InvestmentsService } from './application/services/investments.service';
import { FinanceSummaryService } from './application/services/finance-summary.service';

// Repositories
import { IncomesRepository } from './infrastructure/repositories/incomes.repository';
import { BillsRepository } from './infrastructure/repositories/bills.repository';
import { VariableExpensesRepository } from './infrastructure/repositories/variable-expenses.repository';
import { DebtsRepository } from './infrastructure/repositories/debts.repository';
import { InvestmentsRepository } from './infrastructure/repositories/investments.repository';

// Ports (DI Tokens)
import { INCOMES_REPOSITORY } from './domain/ports/incomes.repository.port';
import { BILLS_REPOSITORY } from './domain/ports/bills.repository.port';
import { VARIABLE_EXPENSES_REPOSITORY } from './domain/ports/variable-expenses.repository.port';
import { DEBTS_REPOSITORY } from './domain/ports/debts.repository.port';
import { INVESTMENTS_REPOSITORY } from './domain/ports/investments.repository.port';

@Module({
  imports: [LoggerModule],
  controllers: [
    IncomesController,
    BillsController,
    VariableExpensesController,
    DebtsController,
    InvestmentsController,
    FinanceSummaryController,
  ],
  providers: [
    // Services
    IncomesService,
    BillsService,
    VariableExpensesService,
    DebtsService,
    InvestmentsService,
    FinanceSummaryService,

    // Repositories
    IncomesRepository,
    BillsRepository,
    VariableExpensesRepository,
    DebtsRepository,
    InvestmentsRepository,

    // DI Tokens (interface-based injection)
    { provide: INCOMES_REPOSITORY, useExisting: IncomesRepository },
    { provide: BILLS_REPOSITORY, useExisting: BillsRepository },
    {
      provide: VARIABLE_EXPENSES_REPOSITORY,
      useExisting: VariableExpensesRepository,
    },
    { provide: DEBTS_REPOSITORY, useExisting: DebtsRepository },
    { provide: INVESTMENTS_REPOSITORY, useExisting: InvestmentsRepository },
  ],
  exports: [
    IncomesService,
    BillsService,
    VariableExpensesService,
    DebtsService,
    InvestmentsService,
    FinanceSummaryService,
  ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class FinanceModule {}
