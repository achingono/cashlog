import { describe, expect, it } from 'vitest';
import { parseTransactionImportFile } from './parsers';

describe('transaction import parsers', () => {
  it('parses CSV transactions with amount and debit/credit columns', () => {
    const csv = [
      'Date,Amount,Debit,Credit,Description,Payee,Memo,Transaction ID',
      '2026-01-10,1200.00,,,Salary,Employer,January payroll,txn-1',
      '2026-01-11,-15.25,,,Coffee Shop,Cafe,Latte,txn-2',
      '2026-01-12,,45.10,,Groceries,Market,,',
      '2026-01-12,,,, , , ,',
    ].join('\n');
    const parsed = parseTransactionImportFile(Buffer.from(csv, 'utf8'), 'import.csv');

    expect(parsed.format).toBe('csv');
    expect(parsed.transactions).toHaveLength(3);
    expect(parsed.transactions[0]).toEqual(
      expect.objectContaining({
        amount: 1200,
        description: 'Salary',
        sourceId: 'txn-1',
      }),
    );
    expect(parsed.transactions[1]).toEqual(expect.objectContaining({ amount: -15.25 }));
    expect(parsed.transactions[2]).toEqual(expect.objectContaining({ amount: -45.1 }));
  });

  it('parses OFX/QFX transactions and account metadata', () => {
    const ofx = `
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <CURDEF>USD
        <BANKACCTFROM>
          <ACCTID>Checking 1234
          <ACCTTYPE>CHECKING
        </BANKACCTFROM>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>DEBIT
            <DTPOSTED>20260110120000
            <TRNAMT>-30.10
            <FITID>fit-1
            <NAME>Coffee Store
            <MEMO>Morning coffee
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>CREDIT
            <DTPOSTED>20260111120000
            <TRNAMT>500.00
            <FITID>fit-2
            <NAME>Paycheck
          </STMTTRN>
        </BANKTRANLIST>
        <LEDGERBAL>
          <BALAMT>1500.25
        </LEDGERBAL>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
  <FI>
    <ORG>MyBank
  </FI>
</OFX>
`;

    const parsed = parseTransactionImportFile(Buffer.from(ofx, 'utf8'), 'statement.qfx');

    expect(parsed.format).toBe('qfx');
    expect(parsed.currency).toBe('USD');
    expect(parsed.accountType).toBe('CHECKING');
    expect(parsed.accountName).toBe('Checking 1234');
    expect(parsed.institution).toBe('MyBank');
    expect(parsed.endingBalance).toBe(1500.25);
    expect(parsed.transactions).toHaveLength(2);
    expect(parsed.transactions[0]).toEqual(
      expect.objectContaining({
        amount: -30.1,
        sourceId: 'fit-1',
        description: 'Coffee Store',
      }),
    );
  });

  it('throws for unsupported extensions', () => {
    expect(() => parseTransactionImportFile(Buffer.from('abc'), 'statement.txt')).toThrow(/Unsupported file extension/i);
  });
});
