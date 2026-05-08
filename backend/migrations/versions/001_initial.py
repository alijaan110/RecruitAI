"""initial

Revision ID: 001_initial
Revises: 
Create Date: 2024-05-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Let alembic handle it with autogenerate or just wait for `Base.metadata.create_all` which happens on startup 
    # for SQLite, but we are asked to put the initial migration script.
    op.create_table('tenants',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('slug', sa.String(length=100), nullable=False),
    sa.Column('logo_url', sa.String(), nullable=True),
    sa.Column('plan', sa.String(), server_default='free', nullable=False),
    sa.Column('cv_uploads_count', sa.Integer(), server_default='0', nullable=False),
    sa.Column('cv_uploads_reset_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('stripe_customer_id', sa.String(length=255), nullable=True),
    sa.Column('stripe_sub_id', sa.String(length=255), nullable=True),
    sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('slug'),
    sa.UniqueConstraint('stripe_customer_id'),
    sa.UniqueConstraint('stripe_sub_id')
    )
    
    op.create_table('users',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('tenant_id', sa.String(length=36), nullable=False),
    sa.Column('full_name', sa.String(length=255), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('hashed_password', sa.String(length=255), nullable=False),
    sa.Column('role', sa.String(), server_default='recruiter', nullable=False),
    sa.Column('avatar_url', sa.String(), nullable=True),
    sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
    sa.Column('last_seen', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email')
    )
    
    op.create_table('jobs',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('tenant_id', sa.String(length=36), nullable=False),
    sa.Column('created_by', sa.String(length=36), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('department', sa.String(length=100), nullable=True),
    sa.Column('location', sa.String(length=255), nullable=True),
    sa.Column('employment_type', sa.String(), server_default='full_time', nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('requirements', sa.JSON(), server_default='[]', nullable=False),
    sa.Column('nice_to_have', sa.JSON(), server_default='[]', nullable=False),
    sa.Column('keywords', sa.JSON(), server_default='[]', nullable=False),
    sa.Column('salary_min', sa.Integer(), nullable=True),
    sa.Column('salary_max', sa.Integer(), nullable=True),
    sa.Column('salary_currency', sa.String(length=10), server_default='USD', nullable=False),
    sa.Column('status', sa.String(), server_default='draft', nullable=False),
    sa.Column('public_slug', sa.String(length=255), nullable=True),
    sa.Column('closes_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('public_slug')
    )
    
    op.create_table('candidates',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('tenant_id', sa.String(length=36), nullable=False),
    sa.Column('full_name', sa.String(length=255), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('phone', sa.String(length=50), nullable=True),
    sa.Column('linkedin_url', sa.Text(), nullable=True),
    sa.Column('portfolio_url', sa.Text(), nullable=True),
    sa.Column('location', sa.String(length=255), nullable=True),
    sa.Column('source', sa.String(length=50), server_default='direct', nullable=False),
    sa.Column('cv_file_path', sa.Text(), nullable=True),
    sa.Column('cv_file_name', sa.String(length=255), nullable=True),
    sa.Column('raw_cv_text', sa.Text(), nullable=True),
    sa.Column('parsed_data', sa.JSON(), server_default='{}', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('tenant_id', 'email', name='uq_tenant_email')
    )

    op.create_table('email_log',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('tenant_id', sa.String(length=36), nullable=False),
    sa.Column('recipient_email', sa.String(length=255), nullable=False),
    sa.Column('recipient_name', sa.String(length=255), nullable=True),
    sa.Column('template_name', sa.String(length=100), nullable=False),
    sa.Column('subject', sa.String(length=500), nullable=False),
    sa.Column('payload', sa.JSON(), server_default='{}', nullable=True),
    sa.Column('status', sa.String(), server_default='queued', nullable=False),
    sa.Column('provider_id', sa.String(length=255), nullable=True),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('applications',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('tenant_id', sa.String(length=36), nullable=False),
    sa.Column('job_id', sa.String(length=36), nullable=False),
    sa.Column('candidate_id', sa.String(length=36), nullable=False),
    sa.Column('stage', sa.String(), server_default='received', nullable=False),
    sa.Column('keyword_score', sa.Numeric(precision=5, scale=2), nullable=True),
    sa.Column('overall_score', sa.Numeric(precision=5, scale=2), nullable=True),
    sa.Column('score_breakdown', sa.JSON(), server_default='{}', nullable=True),
    sa.Column('is_starred', sa.Boolean(), server_default='0', nullable=False),
    sa.Column('is_disqualified', sa.Boolean(), server_default='0', nullable=False),
    sa.Column('disqualify_reason', sa.Text(), nullable=True),
    sa.Column('cover_letter', sa.Text(), nullable=True),
    sa.Column('applied_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('last_stage_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['candidate_id'], ['candidates.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('job_id', 'candidate_id', name='uq_job_candidate')
    )

    op.create_table('candidate_notes',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('application_id', sa.String(length=36), nullable=False),
    sa.Column('tenant_id', sa.String(length=36), nullable=False),
    sa.Column('author_id', sa.String(length=36), nullable=False),
    sa.Column('author_name', sa.String(length=255), nullable=False),
    sa.Column('note_type', sa.String(), server_default='general', nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('is_private', sa.Boolean(), server_default='0', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table('stage_history',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('application_id', sa.String(length=36), nullable=False),
    sa.Column('tenant_id', sa.String(length=36), nullable=False),
    sa.Column('from_stage', sa.String(length=50), nullable=True),
    sa.Column('to_stage', sa.String(length=50), nullable=False),
    sa.Column('changed_by', sa.String(length=36), nullable=True),
    sa.Column('changed_by_name', sa.String(length=255), nullable=True),
    sa.Column('note', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['changed_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

def downgrade() -> None:
    op.drop_table('stage_history')
    op.drop_table('candidate_notes')
    op.drop_table('applications')
    op.drop_table('email_log')
    op.drop_table('candidates')
    op.drop_table('jobs')
    op.drop_table('users')
    op.drop_table('tenants')
